import { Cookies, HttpServerResponse } from "@effect/platform";
import { Effect, Either, Option, String } from "effect";

import { makeAstroEndpoint } from "../../api/handler";
import { AstroContext } from "../../api/tags";

import { Repository } from "../../domain/model";
import { SESSION_ID_COOKIE_NAME } from "./auth/_shared";

export const GET = Effect.gen(function* () {
    const Astro = yield* AstroContext;

    // Early short circuit if no user is logged in
    const maybeAccount = Astro.locals.account;
    if (Option.isNone(maybeAccount)) return HttpServerResponse.redirect("/");

    // Delete the old session cookie
    const session = maybeAccount.value.session;
    const deleteSessionCookie = Cookies.makeCookie(SESSION_ID_COOKIE_NAME, String.empty, {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    }).pipe(Either.getOrUndefined);

    if (deleteSessionCookie === undefined) {
        return yield* Effect.map(
            Effect.promise(() => Astro.rewrite("/500")),
            HttpServerResponse.fromWeb
        );
    }

    // Delete the session from the database
    yield* Repository.deleteSession(session.id);
    return HttpServerResponse.redirect("/", {
        cookies: Cookies.fromIterable([deleteSessionCookie]),
    });
}).pipe(makeAstroEndpoint);
