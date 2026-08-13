import type { SessionState } from "../../client/backend.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Scene } from "foldkit/test";
import { describe, it } from "vitest";

import { SignedOut } from "../../client/backend.ts";
import { messagesFor } from "../../client/messages/index.ts";
import { homeView } from "../../client/pages/home.ts";

/*
  The front page rendered in German. This proves the msgs slice actually
  reaches the view, not that the translation reads well: the selectors are the
  same `de.*` fields the view was handed, so a page that ignored its slice and
  kept hardcoded English would fail here.
*/
const de = messagesFor("de");

type Model = Readonly<{ session: SessionState }>;

const page = {
    update: (model: Model, _message: never): readonly [Model, ReadonlyArray<never>] => [model, []],
    view: (model: Model, h: HtmlBuilder<never>): Html => homeView(h, de.home, model.session),
};

const signedOut: Model = { session: SignedOut() };

const { expect, given, role, scene } = Scene;

describe("home page in German", () => {
    it("renders the German copy it was handed", () => {
        scene(
            page,
            given(signedOut),
            expect(role("heading", { name: de.home.title })).toExist(),
            expect(role("heading", { name: de.home.howItWorksHeading })).toExist(),
            expect(role("heading", { name: de.home.testKeysHeading })).toExist()
        );
    });

    it("sends a signed out German visitor to the login page", () => {
        scene(
            page,
            given(signedOut),
            expect(role("link", { name: de.home.signIn })).toHaveAttr("href", "/login?returnTo=%2Fkeys")
        );
    });
});
