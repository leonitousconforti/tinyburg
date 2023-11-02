import {
    type RequestedGame,
    type SemanticVersion,
    type PuppeteerFetcher,
    type IPuppeteerDetails,
    type RequestedArchitecture,
} from "./types.js";

import { ApkpureScrapingError } from "./types.js";
import { headlessBrowserResource } from "./resources.js";

import puppeteer from "puppeteer";
import { Effect, Scope, Option, pipe } from "effect";

/** These are the pages where we will start trying to download from for each game */
const downloadPages: { [k in RequestedGame]: string } = {
    TinyTowerVegas: "https://apkpure.com/tiny-tower-vegas/com.nimblebit.vegas/download",
    TinyTower: "https://apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower/download",
    BitCity: "https://apkpure.com/bit-city-pocket-town-planner/com.nimblebit.bitcity/download",
    PocketFrogs: "https://apkpure.com/pocket-frogs-tiny-pond-keeper/com.nimblebit.pocketfrogs/download",
    PocketPlanes: "https://apkpure.com/pocket-planes-airline-tycoon/com.nimblebit.pocketplanes/download",
    PocketTrains: "https://apkpure.com/pocket-trains-enterprise-sim/com.nimblebit.pockettrains/download",
    LegoTower: "",
};

/** HTML query selector for the download button */
const downloadButtonQuerySelector: string =
    "body > div.main-body > main > div.download-box.download-button-box.d-normal > a.btn.download-start-btn";

export const getApkpureDetails: PuppeteerFetcher = (
    game: RequestedGame,
    semanticVersion: SemanticVersion,
    architecture: RequestedArchitecture
): Effect.Effect<
    Scope.Scope,
    ApkpureScrapingError,
    readonly [downloadUrl: string, details: Readonly<IPuppeteerDetails>]
> =>
    // Start a browser and navigate to the apkpure product page
    Effect.gen(function* (_: Effect.Adapter) {
        const browser: puppeteer.Browser = yield* _(headlessBrowserResource);
        const page: puppeteer.Page = yield* _(Effect.promise(() => browser.newPage()));
        const url: string = `${downloadPages[game]}/${semanticVersion}`;
        yield* _(Effect.log(`Navigating to download page ${url}`));
        yield* _(Effect.promise(() => page.goto(url, { waitUntil: "load", timeout: 15_000 })));

        const shortDownloadUrl: Effect.Effect<never, never, string> = pipe(
            Effect.promise(() => page.$(downloadButtonQuerySelector)),
            Effect.map(Option.fromNullable),
            Effect.map(Option.getOrThrow),
            Effect.flatMap((x) => Effect.promise(() => x.getProperty("href"))),
            Effect.flatMap((y) => Effect.promise(() => y.jsonValue() as Promise<string>))
        );

        const realDownloadUrl = (z: string): Effect.Effect<never, never, string> =>
            Effect.promise(
                () =>
                    new Promise<string>((resolve, reject) => {
                        page.on("request", async (event) => {
                            const u: string = event.url();
                            if (event.isInterceptResolutionHandled()) return;
                            if (!/^https:\/\/d-[\da-z]*\.winudf\.com/.test(u)) return await event.continue();
                            await event.respond({ status: 200, body: "" });
                            resolve(u);
                            await page.close();
                        });

                        page.goto(z).catch((error) => {
                            if (error.message === "Navigating frame was detached") return;
                            throw error;
                        });

                        setTimeout(() => reject(new Error("timeout get download url")), 5000);
                    })
            );

        return yield* _(
            pipe(
                shortDownloadUrl,
                Effect.tap(() => Effect.promise(() => page.setRequestInterception(true))),
                Effect.flatMap(realDownloadUrl)
            )
        );
    })

        // Transform data to return type
        .pipe(
            Effect.map(
                (downloadUrl) =>
                    [
                        downloadUrl,
                        {
                            name: game,
                            architecture,
                            semVer: semanticVersion,
                            supplier: "apkpure",
                            updatedDate: "unknown",
                        },
                    ] as const
            )
        )

        // Error handling
        .pipe(Effect.catchAll((error) => new ApkpureScrapingError({ message: `${error}` })));
