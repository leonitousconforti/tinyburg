import type { SqlError } from "effect/sql";

import { Effect, Layer, Option, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import type { DevelopersRepository } from "../../domain/developers.ts";

import { type Language, fromAcceptLanguage } from "@tinyburg/shared-ui/Internationalization";

import { CookiePolicy, REAUTH_COOKIE_NAME, maybeCurrentUser } from "../cookies.ts";
import { registrationPolicy } from "../environment.ts";
import { OidcKeys } from "../keys.ts";
import { ConsentLanguage, registeredClient, scopesOf } from "../oauthLive.ts";
import { TinyburgOAuth } from "../oauthServer.ts";
import * as ErrorPage from "../pages/error.ts";

/**
 * The "Sign in with Tinyburg" OIDC provider's routes.
 *
 * The protocol is the OAuth server's (`../oauthLive.ts`): every endpoint
 * below is answered by `TinyburgOAuth.Service.handle`. What this adds around
 * it is what the server leaves to the application - the visitor's language,
 * this provider's own refusals before consent, refusals as pages rather than
 * JSON, the registration endpoint in discovery, and the hand over to the
 * app's own sign in.
 */

const { paths } = TinyburgOAuth;

/**
 * Why an authorization request is refused before the OAuth server sees it,
 * if it is.
 *
 * The server checks a request against everything it declares; this checks
 * it against the client's own registration, which is what the visitor would
 * otherwise only find out about after consenting, when the token endpoint
 * quietly dropped the scopes the client never had. A request naming no
 * client is the server's to call malformed.
 */
const refusalFor = (
    params: URLSearchParams
): Effect.Effect<Option.Option<ErrorPage.ErrorKey>, SqlError.SqlError | Schema.SchemaError, DevelopersRepository> =>
    Effect.gen(function* () {
        const clientId = params.get("client_id");
        if (clientId === null) return Option.none();

        const client = yield* registeredClient(clientId);
        if (Option.isNone(client)) return Option.some("unknownClient");

        const redirectUri = params.get("redirect_uri");
        if (redirectUri !== null && !client.value.registration.redirectUris.includes(redirectUri)) {
            return Option.some("unregisteredRedirectUri");
        }

        const scope = params.get("scope");
        if (scope !== null && !scopesOf(scope).every((requested) => client.value.scopes.has(requested))) {
            return Option.some("invalidScope");
        }

        return Option.none();
    });

const isJson = (response: Response): boolean =>
    response.headers.get("content-type")?.startsWith("application/json") === true;

const DiscoveryDocument = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Json));

/**
 * Discovery with the registration endpoint (`./registration.ts`) added. The
 * OAuth server offers no registration of its own, so it advertises none; a
 * deployment that offers it says so, and one that does not leaves it out, so
 * a client reading discovery learns there is nothing to register with rather
 * than finding out from a 404.
 */
const withRegistrationEndpoint = (response: Response, issuer: string): Effect.Effect<Response> =>
    Effect.gen(function* () {
        const document = yield* Effect.flatMap(
            Effect.promise(() => response.text()),
            Schema.decodeEffect(DiscoveryDocument)
        );
        const body = yield* Schema.encodeEffect(DiscoveryDocument)({
            ...document,
            registration_endpoint: `${issuer}/oauth/register`,
        });
        return new Response(body, { status: response.status, headers: response.headers });
    }).pipe(Effect.orDie);

/**
 * Hands one request to the OAuth server.
 *
 * The server only answers for its configured origin, and behind the TLS
 * proxy this process sees plain http, so the request is put back on the
 * site's own origin rather than trusting forwarded headers to rebuild it.
 */
const delegate = (options: {
    readonly service: (typeof TinyburgOAuth.Service)["Service"];
    readonly issuer: string;
    readonly registrationOffered: boolean;
}) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const language: Language = fromAcceptLanguage(request.headers["accept-language"]);

        const url = HttpServerRequest.toURL(request);
        if (Option.isNone(url)) return yield* ErrorPage.respond({ error: "malformedRequest", language });
        const { pathname, search } = url.value;

        // The browser's first arrival at authorize, with the client's
        // parameters; the server then moves them into its consent cookie and
        // carries on at the bare path.
        const authorizing = request.method === "GET" && pathname === paths.authorize && search !== "";

        if (authorizing) {
            const refusal = yield* refusalFor(url.value.searchParams);
            if (Option.isSome(refusal)) return yield* ErrorPage.respond({ error: refusal.value, language });
        }

        const web = yield* HttpServerRequest.toWeb(
            request.modify({ url: `${options.issuer}${pathname}${search}` })
        ).pipe(Effect.orDie);
        const response = yield* options.service.handle(web).pipe(Effect.provideService(ConsentLanguage, language));

        // Authorize is browser navigation, so its refusals are pages. Past the
        // first arrival, a refusal means the pending authorization is gone:
        // expired, already decided, or from another browser.
        if (pathname === paths.authorize && response.status === 400 && isJson(response)) {
            return yield* ErrorPage.respond({ error: authorizing ? "malformedRequest" : "expiredRequest", language });
        }

        const discovery = pathname === paths.openIdMetadata || pathname === paths.metadata;
        if (options.registrationOffered && discovery && request.method === "GET" && response.status === 200) {
            return HttpServerResponse.fromWeb(yield* withRegistrationEndpoint(response, options.issuer));
        }

        return HttpServerResponse.fromWeb(response);
    });

/**
 * GET /oauth/login - where the OAuth server sends a visitor it needs signed
 * in: nobody is, the sign in is older than the client accepts, or the visitor
 * chose to use another account.
 *
 * In the last two somebody is signed in already, and sign in would wave them
 * straight back. Ending their session on a GET would let any site sign them
 * out with a link, so instead the browser is marked as owing a fresh sign in
 * for as long as an authorization stays pending; sign in honours the mark and
 * the new session replaces the old one. The pending authorization survives in
 * the server's own cookie, and the login page returns to it once the visitor
 * is signed in again.
 */
const login = Effect.gen(function* () {
    const cookies = yield* CookiePolicy;
    const current = yield* maybeCurrentUser;
    const toLogin = HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(paths.authorize)}`);
    if (Option.isNone(current)) return toLogin;

    return HttpServerResponse.setCookieUnsafe(toLogin, cookies.name(REAUTH_COOKIE_NAME), "1", {
        httpOnly: true,
        path: "/",
        secure: cookies.secure,
        sameSite: "lax",
        maxAge: "5 minutes",
    });
});

const isPath = (path: string): path is `/${string}` => path.startsWith("/");

/**
 * The "Sign in with Tinyburg" OIDC provider. Public clients authenticate with
 * PKCE and no secret; confidential clients additionally present their secret.
 */
export const OidcProviderLive = Layer.unwrap(
    Effect.gen(function* () {
        const service = yield* TinyburgOAuth.Service;
        const { issuer } = yield* OidcKeys;
        const registration = yield* registrationPolicy;

        const resourceMetadata = new URL(service.resourceMetadata).pathname;
        if (!isPath(resourceMetadata)) return yield* Effect.die(new Error("resource metadata has no path"));

        const handler = delegate({ service, issuer, registrationOffered: registration.offered });
        const route = (path: `/${string}`) => HttpRouter.add("*", path, handler);

        return Layer.mergeAll(
            route(paths.authorize),
            route(paths.token),
            route(paths.revoke),
            route(paths.jwks),
            route(paths.userInfo),
            route(paths.metadata),
            route(paths.openIdMetadata),
            route(resourceMetadata),
            HttpRouter.add("GET", "/oauth/login", login)
        );
    })
);
