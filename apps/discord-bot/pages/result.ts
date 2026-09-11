/**
 * The page the browser lands on after the `/link` round trip.
 *
 * All three outcomes - linked, cancelled, refused - are a heading and a
 * sentence, which is what `StandalonePage.Notice` is, so this module is only
 * the shape of the model and nothing else.
 *
 * It is rendered rather than interpolated because one of those three lines
 * carries a Tinyburg display name, which its owner chose. Putting that into
 * markup by hand is a decision that has to be got right every time it is
 * written; letting the serializer decide is a decision got right once.
 */

import type { Effect } from "effect";
import type { HttpServerResponse } from "effect/unstable/http";

import type { Language } from "@tinyburg/shared-ui/Internationalization";

import * as StandalonePage from "@tinyburg/shared-ui/StandalonePage";

/**
 * @since 1.0.0
 * @category Models
 */
export interface ResultModel extends StandalonePage.Notice {
    readonly language: Language;
}

/**
 * Renders one outcome to a complete HTML document.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const render = (model: ResultModel): Effect.Effect<string> => StandalonePage.renderNotice(model);

/**
 * Answers one outcome.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const respond = (model: ResultModel, status: number): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
    StandalonePage.respondNotice(model, { status });
