/// <reference lib="dom" />

import * as Schema from "@effect/schema/Schema";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Schedule from "effect/Schedule";
import * as puppeteer from "puppeteer";

import { browserResource } from "./resources.js";
import {
    AppVersionCode,
    Games,
    SemanticVersion,
    SemanticVersionAndAppVersionCode,
    type $AppVersionCode,
    type $SemanticVersion,
} from "./schemas.js";

/**
 * @since 1.0.0
 * @category Api interface
 */
export interface $IPuppeteerDetails
    extends Schema.Struct<{
        name: Schema.$String;
        appVersionCode: $AppVersionCode;
        semanticVersion: $SemanticVersion;
        updatedDate: Schema.DateFromString;
        approximateFileSizeMB: Schema.$String;
    }> {}

/**
 * @since 1.0.0
 * @category Decoded types
 */
export type IPuppeteerDetails = Schema.Schema.Type<$IPuppeteerDetails>;

/**
 * @since 1.0.0
 * @category Encoded types
 */
export type IPuppeteerDetailsEncoded = Schema.Schema.Encoded<$IPuppeteerDetails>;

/**
 * @since 1.0.0
 * @category Schemas
 */
export const IPuppeteerDetails: $IPuppeteerDetails = Schema.Struct({
    name: Schema.String,
    appVersionCode: AppVersionCode,
    semanticVersion: SemanticVersion,
    updatedDate: Schema.DateFromString,
    approximateFileSizeMB: Schema.String,
}).annotations({
    identifier: "IPuppeteerDetails",
    title: "Puppeteer Details",
    description: "Details about an app version scraped from a puppeteer page",
});

/**
 * @since 1.0.0
 * @category Errors
 */
export class ApksupportScrapingError extends Data.TaggedError("ApksupportScrapper")<{ message: string }> {}

export const getApksupportDetails = (
    game: Games,
    versionInfo: SemanticVersionAndAppVersionCode
): Effect.Effect<readonly [downloadUrl: string, details: IPuppeteerDetails], ApksupportScrapingError, never> =>
    Effect.gen(function* () {
        const { appVersionCode, semanticVersion } = versionInfo;
        const browser: puppeteer.Browser = yield* browserResource;
        const page: puppeteer.Page = yield* Effect.tryPromise(() => browser.newPage());
        const url: string = `https://apk.support/download-app/${game}/${appVersionCode}/${semanticVersion}`;

        yield* Effect.logInfo(`Navigating to ${url}`);
        yield* Effect.tryPromise(() => page.goto(url, { waitUntil: ["networkidle0", "load"] }));
        yield* Effect.tryPromise(() => page.waitForSelector("#apksubmit"));

        const requestPlaystoreApk: Effect.Effect<void, ApksupportScrapingError, never> = Effect.retryOrElse(
            Function.pipe(
                Effect.tryPromise(() => page.click("#apksubmit")),
                Effect.flatMap(() => Effect.tryPromise(() => page.waitForNetworkIdle())),
                Effect.flatMap(() =>
                    Effect.tryPromise({
                        try: () => page.waitForSelector("#ssg > div > a", { timeout: 3000 }),
                        catch: (error) => new ApksupportScrapingError({ message: `${error}` }),
                    })
                )
            ),
            Schedule.addDelay(Schedule.recurs(3), () => "1000 millis"),
            () => Effect.fail(new ApksupportScrapingError({ message: "Failed to request Playstore APK" }))
        );

        const getSpanElementText = (selector: string): Effect.Effect<string, ApksupportScrapingError, never> =>
            Effect.tryPromise({
                try: () => page.$eval(selector, (span) => (span as HTMLSpanElement).textContent || ""),
                catch: (error) => new ApksupportScrapingError({ message: `${error}` }),
            });

        const getAnchorElementLink = (selector: string): Effect.Effect<string, ApksupportScrapingError, never> =>
            Effect.tryPromise({
                try: () => page.$eval(selector, (anchor) => (anchor as HTMLAnchorElement).href),
                catch: (error) => new ApksupportScrapingError({ message: `${error}` }),
            }).pipe(Effect.retry(Schedule.addDelay(Schedule.recurs(3), () => "1000 millis")));

        const downloadLinks: string[] = ["#ssg > div > a", "#sse > div > a"];
        const updatedDateSelector: string = "div.other_version > ul > li > a > div > span";
        const approximateFileSizeSelector: string = "div.other_version > ul > li > a > div > div.ubGTjb > span > span";

        yield* requestPlaystoreApk;
        const updatedDate: string = yield* getSpanElementText(updatedDateSelector);
        const approximateFileSizeMB: string = yield* getSpanElementText(approximateFileSizeSelector);
        const downloadUrl: string = yield* Effect.firstSuccessOf(downloadLinks.map(getAnchorElementLink));

        const details: IPuppeteerDetails = yield* Schema.decode(IPuppeteerDetails)({
            name: game,
            semanticVersion,
            updatedDate: updatedDate,
            appVersionCode: String(appVersionCode),
            approximateFileSizeMB: approximateFileSizeMB,
        });

        return [downloadUrl, details] as const;
    })
        .pipe(Effect.scoped)
        .pipe(Effect.catchAll((error) => new ApksupportScrapingError({ message: `${error}` })));
