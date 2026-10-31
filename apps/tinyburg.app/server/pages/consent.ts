/**
 * The OIDC consent screen, server-rendered with Foldkit.
 *
 * The page has to be server-rendered rather than a SPA route: during a
 * third-party authorization the browser holds no access token for the SPA to
 * authenticate with, only the provider session cookie this page runs on.
 *
 * It used to be an HTML string with a hand-written `escapeHtml` applied at each
 * interpolation, which is a correctness question asked once per value and got
 * right by inspection. As a Foldkit view the same markup is typed and the
 * escaping belongs to the serializer rather than to the author - which matters
 * here more than anywhere, because the page prints a client name and a redirect
 * host that whoever registered the client chose, to a visitor who is one click
 * from granting a token.
 */

import type { Effect } from "effect";

import type { Language } from "@tinyburg/shared-ui/Internationalization";
import type * as OAuthServer from "@yielded/auth/OAuthServer";
import type { HtmlBuilder } from "foldkit/html";

import * as StandalonePage from "@tinyburg/shared-ui/StandalonePage";
import { Api } from "@tinyburg/tinyburg-sdk/Sdk";
import { Api as TreasuryApi } from "@tinyburg/treasury-sdk/Sdk";
import * as OAuthScope from "@yielded/auth/OAuthScope";

import { consentMessagesFor } from "./consentMessages.ts";

/**
 * What each game and treasury scope means, read off the api that enforces
 * it. English only, by decision: the sentence a player consents to and the
 * endpoint it unlocks are one declaration, so they cannot disagree.
 */
const gameScopeDescriptions: ReadonlyMap<string, string> = new Map(
    [...OAuthScope.catalog(Api), ...OAuthScope.catalog(TreasuryApi)].map((scope) => [scope.name, scope.description])
);

/**
 * Everything the page renders, resolved before the view runs.
 *
 * The view is a pure function of this and nothing else, which is what lets a
 * test render the page without a database, a session, or a running provider.
 */
export interface ConsentModel {
    readonly clientName: string;
    readonly scopes: ReadonlyArray<string>;
    readonly redirectHost: string;
    /** Where the decision is posted: the OAuth server's authorize endpoint. */
    readonly action: string;
    /** The OAuth server's token binding this form to this visitor and request. */
    readonly csrf: string;
    /** Where "use another account" leads: signing out, then back in. */
    readonly loginPath: string;
    readonly language: Language;
}

/**
 * What each scope means: the OIDC scopes in the visitor's language, the game
 * scopes as the api describes them.
 *
 * An unrecognised scope falls back to its own identifier rather than being
 * hidden: a permission nobody wrote copy for is still a permission being
 * granted, and dropping it would show the visitor a shorter list than the one
 * they are agreeing to.
 */
const scopeDescriptions = (model: ConsentModel): ReadonlyArray<string> => {
    const { scopeDescriptions: descriptions } = consentMessagesFor[model.language];
    return model.scopes.map((scope) => descriptions[scope] ?? gameScopeDescriptions.get(scope) ?? scope);
};

/**
 * The consent screen.
 *
 * @since 1.0.0
 * @category Views
 */
export const view = (model: ConsentModel, h: HtmlBuilder<never>) => {
    const messages = consentMessagesFor[model.language];

    return {
        title: messages.title(model.clientName),
        lang: model.language,
        body: StandalonePage.card(h, {}, [
            h.h1([], [model.clientName]),
            StandalonePage.lead(h, messages.wantsAccess),
            StandalonePage.permissions(h, scopeDescriptions(model)),
            StandalonePage.actions(h, {
                action: model.action,
                hidden: { csrf: model.csrf },
                name: "decision",
                buttons: [
                    { value: "approve", label: messages.authorize, variant: "primary" },
                    { value: "deny", label: messages.cancel, variant: "secondary" },
                ],
            }),
            StandalonePage.footnote(h, messages.destination(model.redirectHost)),
            h.p([h.Class("footnote")], [h.a([h.Href(model.loginPath)], [messages.switchAccount])]),
        ]),
    };
};

/**
 * Renders the consent screen to a complete HTML document.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const render = (model: ConsentModel): Effect.Effect<string> =>
    StandalonePage.render({ model, view, favicon: true });

/**
 * Builds the page's model from what the OAuth server asks consent for.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const modelFor = (consent: OAuthServer.Consent, language: Language): ConsentModel => ({
    clientName: consent.clientName,
    scopes: consent.scopes,
    redirectHost: new URL(consent.redirectUri).host,
    action: consent.action,
    csrf: consent.csrf,
    loginPath: consent.loginPath,
    language,
});
