import puppeteer from "puppeteer";
import { Effect, Scope } from "effect";

/** How to release the browser once we are done with it. */
const releaseBrowser = (browser: puppeteer.Browser): Effect.Effect<never, never, void> =>
    Effect.promise(() => browser.close());

/** How to acquire a browser instance. */
const acquireBrowser = (
    launchOptions: puppeteer.PuppeteerLaunchOptions
): Effect.Effect<never, never, puppeteer.Browser> => Effect.promise(() => puppeteer.launch(launchOptions));

/** Browser resource available to be consumed. */
export const browserResource: Effect.Effect<Scope.Scope, never, puppeteer.Browser> = Effect.acquireRelease(
    acquireBrowser({ headless: false }),
    releaseBrowser
);