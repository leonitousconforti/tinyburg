/**
 * The refusal page for the browser half of the OIDC flow.
 *
 * Only a handful of failures reach a visitor as a page. Everything else in the
 * code flow answers to the client's registered redirect uri as an `error`
 * parameter, per RFC 6749 - but a request whose client is unknown, or whose
 * redirect uri is not the one registered, has no trustworthy place to be sent,
 * so it stops here instead.
 *
 * These used to be `text/plain` 400s, which is a raw sentence on a white page
 * in the middle of an otherwise styled sign-in, and English regardless of who
 * was reading it.
 */

import type { Effect } from "effect";
import type { HttpServerResponse } from "effect/unstable/http";

import type { Language } from "@tinyburg/shared-ui/Internationalization";

import * as StandalonePage from "@tinyburg/shared-ui/StandalonePage";

import { type ConsentMessages, consentMessagesFor } from "./consentMessages.ts";

/**
 * Which refusal to show.
 *
 * A key rather than a string, so the route names the situation and this module
 * owns the words for it in every language.
 *
 * @since 1.0.0
 * @category Models
 */
export type ErrorKey = Exclude<keyof ConsentMessages["errors"], "title">;

/**
 * @since 1.0.0
 * @category Models
 */
export interface ErrorModel {
    readonly error: ErrorKey;
    readonly language: Language;
}

const notice = (model: ErrorModel): StandalonePage.Notice => {
    const { errors } = consentMessagesFor[model.language];
    return { language: model.language, title: errors.title, body: errors[model.error] };
};

/**
 * Renders a refusal to a complete HTML document.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const render = (model: ErrorModel): Effect.Effect<string> =>
    StandalonePage.renderNotice(notice(model), { favicon: true });

/**
 * Answers a refusal.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const respond = (model: ErrorModel): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
    StandalonePage.respondNotice(notice(model), { favicon: true, status: 400 });
