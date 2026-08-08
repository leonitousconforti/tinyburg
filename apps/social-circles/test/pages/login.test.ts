import { Option } from "effect";

import type { Html, HtmlBuilder } from "foldkit/html";

import { Scene } from "foldkit/test";
import { describe, it } from "vitest";

import { en } from "../../client/messages/en.ts";
import { loginView } from "../../client/pages/login.ts";

/*
  The login page is a pure view: every affordance on it is a server round trip
  behind an `<a href>`, so there are no Messages and update never runs. The
  selectors go through `en.login` rather than hardcoded literals, so a copy
  edit fails in exactly one place.
*/
type Model = Readonly<{
    returnTo: Option.Option<string>;
    error: Option.Option<string>;
}>;

const page = {
    update: (model: Model, _message: never): readonly [Model, ReadonlyArray<never>] => [model, []],
    view: (model: Model, h: HtmlBuilder<never>): Html => loginView(h, en.login, model.returnTo, model.error),
};

const arriving: Model = { returnTo: Option.none(), error: Option.none() };

const withError = (error: string): Model => ({ ...arriving, error: Option.some(error) });

const { expect, given, role, scene } = Scene;

describe("login page", () => {
    it("offers the provider sign in to someone arriving clean", () => {
        scene(
            page,
            given(arriving),
            expect(role("heading", { name: en.login.heading })).toExist(),
            expect(role("link", { name: en.login.signInWithTinyburg })).toHaveAttr("href", "/auth/login"),
            expect(role("status")).toBeAbsent(),
            expect(role("alert")).toBeAbsent()
        );
    });

    it("carries returnTo through the provider link, encoded", () => {
        scene(
            page,
            given({ ...arriving, returnTo: Option.some("/towers") }),
            expect(role("link", { name: en.login.signInWithTinyburg })).toHaveAttr(
                "href",
                "/auth/login?returnTo=%2Ftowers"
            )
        );
    });

    it("announces a cancelled sign in politely rather than as an error", () => {
        scene(
            page,
            given(withError("oauth_denied")),
            expect(role("status")).toHaveText(en.login.cancelled),
            expect(role("alert")).toBeAbsent()
        );
    });

    it.each(["invalid_oauth_cookies", "invalid_oauth_callback"])(
        "tells someone whose round trip lost its footing (%s) to check cookies",
        (code) => {
            scene(
                page,
                given(withError(code)),
                expect(role("alert")).toHaveText(en.login.interrupted),
                expect(role("status")).toBeAbsent()
            );
        }
    );

    it("falls back to try again for an unrecognised code", () => {
        scene(
            page,
            given(withError("some_code_nobody_has_written_yet")),
            expect(role("alert")).toHaveText(en.login.failed),
            expect(role("status")).toBeAbsent()
        );
    });
});
