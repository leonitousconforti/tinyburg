import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Scope from "effect/Scope";
import * as puppeteer from "puppeteer";

/** How to release the browser once we are done with it. */
const releaseBrowser = (browser: puppeteer.Browser): Effect.Effect<void, never, never> =>
    Effect.promise(() => browser.close());

/** How to acquire a browser instance. */
const acquireBrowser = (
    launchOptions: puppeteer.PuppeteerLaunchOptions
): Effect.Effect<puppeteer.Browser, Cause.UnknownException, never> =>
    Effect.tryPromise(() => puppeteer.launch(launchOptions));

/** Browser resource available to be consumed. */
export const browserResource: Effect.Effect<puppeteer.Browser, Cause.UnknownException, Scope.Scope> =
    Effect.acquireRelease(acquireBrowser({ headless: false }), releaseBrowser);
