import type { Html, HtmlBuilder } from "foldkit/html";

import { Scene } from "foldkit/test";
import { describe, it } from "vitest";

import { messagesFor } from "../../client/messages/index.ts";
import { homeView } from "../../client/pages/home.ts";

/*
  Renders the home page with the German messages and asserts the German copy
  lands in the tree. This proves the msgs slices actually thread through the
  view (not that the translation is any good); the per-page behaviour tests
  keep selecting through `en`.
*/
const de = messagesFor("de");
const en = messagesFor("en");

const page = {
    update: (model: null, _message: never): readonly [null, ReadonlyArray<never>] => [model, []],
    view: (_model: null, h: HtmlBuilder<never>): Html => homeView(h, de.home, de.shared),
};

const { expect, given, role, scene, text } = Scene;

describe("home page rendered in German", () => {
    it("shows the German copy where the English copy would be", () => {
        scene(
            page,
            given(null),
            expect(role("heading", { name: de.home.featuresHeading })).toExist(),
            expect(role("heading", { name: en.home.featuresHeading })).toBeAbsent(),
            expect(role("link", { name: de.home.startTrading })).toHaveAttr("href", "/login"),
            expect(text(de.home.copyright)).toExist()
        );
    });
});
