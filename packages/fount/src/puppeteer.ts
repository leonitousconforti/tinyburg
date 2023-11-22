/// <reference lib="dom" />

import puppeteer from "puppeteer";
import { Data, Effect, Schedule, Scope, pipe } from "effect";

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
): Effect.Effect<Scope.Scope, ApksupportScrapingError, readonly [downloadUrl: string, details: IPuppeteerDetails]> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const { appVersionCode, semanticVersion } = versionInfo;
        const browser: puppeteer.Browser = yield* _(browserResource);
        const page: puppeteer.Page = yield* _(Effect.promise(() => browser.newPage()));
        const url: string = `https://apk.support/download-app/${game}/${appVersionCode}/${semanticVersion}`;

        yield* _(Effect.logInfo(`Navigating to ${url}`));
        yield* _(Effect.promise(() => page.goto(url, { waitUntil: ["networkidle0", "load"] })));
        yield* _(Effect.promise(() => page.waitForSelector("#apksubmit")));

        const requestPlaystoreApk: Effect.Effect<never, ApksupportScrapingError, void> = Effect.retryOrElse(
            pipe(
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
            () => {
                return game === Games.TinyTowerVegas
                    ? Effect.unit
                    : Effect.fail(new ApksupportScrapingError({ message: "Failed to request Playstore APK" }));
            }
        );

        const getSpanElementText = (selector: string): Effect.Effect<never, ApksupportScrapingError, string> =>
            Effect.promise(() => page.$eval(selector, (span) => (span as HTMLSpanElement).textContent || ""));

        const getAnchorElementLink = (selector: string): Effect.Effect<never, ApksupportScrapingError, string> =>
            Effect.tryPromise({
                try: () => page.$eval(selector, (anchor) => (anchor as HTMLAnchorElement).href),
                catch: (error) => new ApksupportScrapingError({ message: `${error}` }),
            }).pipe(Effect.retry(Schedule.addDelay(Schedule.recurs(3), () => "1000 millis")));

        const updatedDateSelector: string = "div.other_version > ul > li > a > div > span";
        const downloadLinks: string[] = ["#ssg > div > a", "#sse > div > a", "#ogdl > a", "#atload > a"];
        const approximateFileSizeSelector: string = "div.other_version > ul > li > a > div > div.ubGTjb > span > span";

        yield* _(requestPlaystoreApk);
        const updatedDate: string = yield* _(getSpanElementText(updatedDateSelector));
        const approximateFileSizeMB: string = yield* _(getSpanElementText(approximateFileSizeSelector));
        const downloadUrl: string = yield* _(Effect.firstSuccessOf(downloadLinks.map(getAnchorElementLink)));

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
