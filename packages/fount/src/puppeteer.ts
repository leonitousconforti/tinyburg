/// <reference lib="dom" />

import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Schedule from "effect/Schedule";
import * as Scope from "effect/Scope";
import * as puppeteer from "puppeteer";

import { browserResource } from "./resources.js";
import { Games, SemanticVersion, SemanticVersionAndAppVersionCode } from "./types.js";

export interface IPuppeteerDetails {
    name: string;
    updatedDate: Date;
    appVersionCode: string;
    approximateFileSizeMB: number;
    semanticVersion: SemanticVersion;
}

export class ApksupportScrapingError extends Data.TaggedError("ApksupportScrapper")<{ message: string }> {}

export const getApksupportDetails = (
    game: Games,
    versionInfo: SemanticVersionAndAppVersionCode
): Effect.Effect<readonly [downloadUrl: string, details: IPuppeteerDetails], ApksupportScrapingError, Scope.Scope> =>
    Effect.gen(function* () {
        const { appVersionCode, semanticVersion } = versionInfo;
        const browser: puppeteer.Browser = yield* browserResource;
        const page: puppeteer.Page = yield* Effect.promise(() => browser.newPage());
        const url: string = `https://apk.support/download-app/${game}/${appVersionCode}/${semanticVersion}`;

        yield* Effect.logInfo(`Navigating to ${url}`);
        yield* Effect.promise(() => page.goto(url, { waitUntil: ["networkidle0", "load"] }));
        yield* Effect.promise(() => page.waitForSelector("#apksubmit"));

        const requestPlaystoreApk: Effect.Effect<void, ApksupportScrapingError, never> = Effect.retryOrElse(
            Function.pipe(
                Effect.promise(() => page.click("#apksubmit")),
                Effect.flatMap(() => Effect.promise(() => page.waitForNetworkIdle())),
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
            Effect.promise(() => page.$eval(selector, (span) => (span as HTMLSpanElement).textContent || ""));

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

        return [
            downloadUrl,
            {
                name: game,
                appVersionCode,
                semanticVersion,
                updatedDate: new Date(updatedDate),
                approximateFileSizeMB: Number.parseFloat(approximateFileSizeMB),
            },
        ] as const;
    }).pipe(Effect.catchAll((error) => new ApksupportScrapingError({ message: `${error}` })));
