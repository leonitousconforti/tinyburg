import type { SessionState } from "../../client/backend.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Scene } from "foldkit/test";
import { describe, it } from "vitest";

import { SignedOut } from "../../client/backend.ts";
import { de } from "../../client/messages/de.ts";
import { messagesFor } from "../../client/messages/index.ts";
import { homeView } from "../../client/pages/home.ts";

/*
  One localized render, wired exactly the way `main.ts` does it: the view gets
  the `messagesFor("de")` slice and the assertions select by the German
  accessible names from `de.home`. This proves the threading, not the
  translation quality.
*/
type Model = Readonly<{ session: SessionState }>;

const page = {
    update: (model: Model, _message: never): readonly [Model, ReadonlyArray<never>] => [model, []],
    view: (model: Model, h: HtmlBuilder<never>): Html => homeView(h, messagesFor("de").home, model.session),
};

const signedOut: Model = { session: SignedOut() };

const { expect, given, role, scene } = Scene;

describe("home page in German", () => {
    it("renders the German copy for a signed-out visitor", () => {
        scene(
            page,
            given(signedOut),
            expect(role("heading", { name: de.home.permissionTitle })).toExist(),
            expect(role("heading", { name: de.home.connectionTitle })).toExist(),
            expect(role("link", { name: de.home.signIn })).toHaveAttr("href", "/login"),
            expect(role("link", { name: de.home.whatYoudShare })).toHaveAttr("href", "/privacy")
        );
    });
});
