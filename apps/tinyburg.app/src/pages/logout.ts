import { Effect, Option, String } from "effect";
import { Cookies, HttpServerResponse } from "effect/unstable/http";

import { AstroContext } from "../../api/context.ts";
import { makeAstroEndpoint } from "../../api/handler.ts";
import { SessionsRepository } from "../../domain/sessions.ts";
import { SESSION_ID_COOKIE_NAME } from "./auth/_shared.ts";

export const GET = Effect.gen(function* () {
    const Astro = yield* AstroContext;

    // Early short circuit if no user is logged in
    const maybeAccount = Astro.locals.account;
    if (Option.isNone(maybeAccount)) return HttpServerResponse.redirect("/");

    // Delete the old session cookie
    const session = maybeAccount.value.session;
    const deleteSessionCookie = Cookies.makeCookieUnsafe(SESSION_ID_COOKIE_NAME, String.empty, {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Delete the session from the database
    yield* SessionsRepository.use((repo) => repo.deleteSession(session.id));
    return HttpServerResponse.redirect("/", {
        cookies: Cookies.fromIterable([deleteSessionCookie]),
    });
}).pipe(makeAstroEndpoint);
