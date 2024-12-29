/// <reference lib="dom" />

import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

import { AnyGame } from "./games.js";
import { browserResource } from "./resources.js";
import { AppVersionCode, SemanticVersion, SemanticVersionAndAppVersionCode } from "./schemas.js";

/**
 * @since 1.0.0
 * @category Schemas
 */
export class IPuppeteerDetails extends Schema.Struct({
    name: Schema.String,
    appVersionCode: AppVersionCode,
    semanticVersion: SemanticVersion,
    updatedDate: Schema.DateFromString,
}).annotations({
    identifier: "IPuppeteerDetails",
    title: "Puppeteer Details",
    description: "Details about an app version scraped from a puppeteer page",
}) {}

/**
 * @since 1.0.0
 * @category Errors
 */
export class ApksupportScrapingError extends Data.TaggedError("ApksupportScrapper")<{ message: string }> {}

export const getApksupportDetails = (
    game: AnyGame,
    versionInfo: typeof SemanticVersionAndAppVersionCode.Type
): Effect.Effect<
    readonly [downloadUrl: string, details: typeof IPuppeteerDetails.Type],
    ApksupportScrapingError,
    never
> =>
    Effect.gen(function* () {
        const { appVersionCode, semanticVersion } = versionInfo;
        const browser = yield* browserResource;
        const page = yield* Effect.tryPromise(() => browser.newPage());
        const url = `https://apk.support/download-app/${game}/${appVersionCode}/${semanticVersion}`;

        yield* Effect.logDebug(`Navigating to ${url}`);
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

        const downloadLinks = ["#ssg > div > a", "#sse > div > a"];
        const updatedDateSelector = "#ogdl > div > table > tbody > tr:nth-child(2) > td:nth-child(2)";

        yield* requestPlaystoreApk;
        const updatedDate = yield* getSpanElementText(updatedDateSelector);
        const downloadUrl = yield* Effect.firstSuccessOf(downloadLinks.map(getAnchorElementLink));

        const details = yield* Schema.decodeUnknown(IPuppeteerDetails)({
            name: game,
            updatedDate,
            semanticVersion,
            appVersionCode: String(appVersionCode),
        });

        return [downloadUrl, details] as const;
    })
        .pipe(Effect.scoped)
        .pipe(Effect.catchAll((error) => new ApksupportScrapingError({ message: `${error}` })));
