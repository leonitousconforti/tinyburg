import { Option } from "effect";

import type { Html, HtmlBuilder } from "foldkit/html";

import { Scene } from "foldkit/test";
import { describe, it } from "vitest";

import { loginView } from "../../client/pages/login.ts";

/*
  The login page is a pure view: every affordance on it is a server round trip
  behind an `<a href>`, so there are no Messages and update never runs. The
  Model is only what `main.ts` reads out of the url and hands to `loginView`.
*/
type Model = Readonly<{
    returnTo: Option.Option<string>;
    error: Option.Option<string>;
}>;

const page = {
    update: (model: Model, _message: never): readonly [Model, ReadonlyArray<never>] => [model, []],
    view: (model: Model, h: HtmlBuilder<never>): Html => loginView(h, model.returnTo, model.error),
};

const arriving: Model = { returnTo: Option.none(), error: Option.none() };

const withError = (error: string): Model => ({ ...arriving, error: Option.some(error) });

const { expect, given, role, scene, text } = Scene;

describe("login page", () => {
    it("offers both providers to someone arriving clean", () => {
        scene(
            page,
            given(arriving),
            expect(role("heading", { name: "Welcome to Tinyburg" })).toExist(),
            expect(role("link", { name: "Continue with Google" })).toHaveAttr("href", "/auth/google/login"),
            expect(role("link", { name: "Continue with Discord" })).toHaveAttr("href", "/auth/discord/login"),
            expect(role("status")).toBeAbsent(),
            expect(role("alert")).toBeAbsent()
        );
    });

    it("carries returnTo through to both provider links, encoded", () => {
        scene(
            page,
            given({ ...arriving, returnTo: Option.some("/towers/@me") }),
            expect(role("link", { name: "Continue with Google" })).toHaveAttr(
                "href",
                "/auth/google/login?returnTo=%2Ftowers%2F%40me"
            ),
            expect(role("link", { name: "Continue with Discord" })).toHaveAttr(
                "href",
                "/auth/discord/login?returnTo=%2Ftowers%2F%40me"
            )
        );
    });

    /*
      Cancelling is not a failure. It gets `role="status"` so a screen reader
      announces it politely, where everything else gets `role="alert"`. This is
      the whole point of the `denied` branch, and it is invisible to a test that
      only looks at the wording.
    */
    it("announces a cancelled sign in politely rather than as an error", () => {
        scene(
            page,
            given(withError("oauth_denied")),
            expect(role("status")).toContainText("Sign in was cancelled"),
            expect(role("alert")).toBeAbsent()
        );
    });

    it.each(["invalid_oauth_intent", "invalid_oauth_cookies", "invalid_oauth_callback"])(
        "tells someone whose round trip lost its footing (%s) to check cookies",
        (code) => {
            scene(
                page,
                given(withError(code)),
                expect(role("alert")).toContainText("expired or was interrupted"),
                expect(role("alert")).toContainText("allows cookies"),
                expect(role("status")).toBeAbsent()
            );
        }
    );

    /*
      Every code the server invents that nobody has classified has to land on
      "try again" rather than falling through to a blank page, so an unknown
      string is the case worth pinning.
    */
    it("falls back to try again for an unrecognised code", () => {
        scene(
            page,
            given(withError("some_code_nobody_has_written_yet")),
            expect(role("alert")).toHaveText("We couldn't finish signing you in. Please try again."),
            expect(role("status")).toBeAbsent()
        );
    });

    it("links the terms and privacy policy it claims agreement to", () => {
        scene(
            page,
            given(arriving),
            expect(text("Terms of Service")).toHaveAttr("href", "/terms"),
            expect(text("Privacy Policy")).toHaveAttr("href", "/privacy")
        );
    });
});
