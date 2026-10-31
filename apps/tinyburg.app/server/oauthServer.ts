import { Context, Effect } from "effect";

import * as TreasuryScopes from "@tinyburg/treasury-sdk/Scopes";
import * as OAuthScope from "@yielded/auth/OAuthScope";
import * as OAuthServer from "@yielded/auth/OAuthServer";

import { API_SCOPES, SERVED_GAMES } from "../shared/scopes.ts";

/**
 * The scope a client asks for when it needs to act while the user is away.
 * A client registered with it is issued refresh tokens.
 */
export const OFFLINE_ACCESS = OAuthScope.make("offline_access");

/**
 * Every scope the provider declares beyond the OpenID ones: `offline_access`,
 * and the scopes of the apis that exist behind `/v1` ({@link API_SCOPES}),
 * so a scope an endpoint accepts is always one a client may ask for.
 *
 * Access tokens are JWTs that carry the declared scopes, and `@yielded/auth`
 * refuses JWT access tokens once the declared scopes joined pass
 * {@link MAX_DECLARED_SCOPE_LENGTH} characters, which is why the games
 * without an api here are left out: every game would not fit.
 */
export const APPLICATION_SCOPES: ReadonlyArray<OAuthScope.OAuthScope> = [
    OFFLINE_ACCESS,
    ...API_SCOPES.map((scope) => scope.name),
];

/** The OAuth server's id: its routes live under `/oauth/<id>/...`. */
const SERVER_ID = "tinyburg";

/**
 * The Tinyburg OAuth server: its routes live under `/oauth/tinyburg/...`, and
 * `makeOpenId` declares `openid`, `profile` and `email` alongside
 * {@link APPLICATION_SCOPES}.
 */
export const TinyburgOAuth = OAuthServer.makeOpenId(SERVER_ID, { scopes: APPLICATION_SCOPES });

/**
 * The namespace the OAuth server files its grants under in
 * `yielded_oauth_server`: `@yielded/auth` keys them by `<origin>/oauth/<id>`.
 */
export const grantNamespaceFor = (issuer: string): string => `${issuer}/oauth/${SERVER_ID}`;

/**
 * The longest the declared scopes may be, joined with spaces, for the OAuth
 * server to issue JWT access tokens: `@yielded/auth` refuses to start past it.
 */
export const MAX_DECLARED_SCOPE_LENGTH = 4096;

/** Every scope the server declares, joined with spaces, as `@yielded/auth` measures it. */
export const DECLARED_SCOPES: string = TinyburgOAuth.Scope.literals.join(" ");

/** Every scope a client may register for: the OpenID ones it uses, and {@link APPLICATION_SCOPES}. */
export const SUPPORTED_SCOPES: ReadonlyArray<string> = ["openid", "profile", ...APPLICATION_SCOPES];

/**
 * Everything the first-party app may do on the visitor's behalf, with its
 * session cookie on `/v1`. Its row in `oauth_clients` is registered for the
 * same scopes.
 */
export const FIRST_PARTY_SCOPES: ReadonlySet<string> = new Set([
    "openid",
    "profile",
    ...SERVED_GAMES.map((area) => area.name),
    TreasuryScopes.Treasury.name,
]);

/**
 * What the access tokens `/auth/token` mints for the first-party app carry:
 * the treasury's area, the one api the app calls with a token rather than
 * its session cookie, and `openid`, which the flow that mints them needs.
 * The token sits in page memory, where a script could lift it, so it opens
 * none of `/v1`'s towers (`push_save`, `receive_gift`, `send_item`).
 */
export const FIRST_PARTY_TOKEN_SCOPES: ReadonlyArray<string> = ["openid", TreasuryScopes.Treasury.name];

/**
 * The one resource every Tinyburg access token is issued for: the whole api
 * under `/v1`, tinyburg.app's own endpoints and the treasury's behind it
 * alike. A token's audience, and the path of its protected resource
 * metadata, `/.well-known/oauth-protected-resource/v1`.
 */
export const apiResourceFor = (issuer: string): string => `${issuer}/v1`;

/**
 * Where the first party's authorization codes are sent. Only ever matched,
 * never visited: `/auth/token` runs the first party's authorization inside
 * this server and reads the code off the redirect. Derived from the site's
 * own origin so every deployment matches itself, whatever its row stores.
 */
export const firstPartyRedirectUriFor = (issuer: string): string => `${issuer}/auth/token`;

/** Who a `/v1` request acts for: the user, and the client acting for them. */
export interface Caller {
    readonly userId: string;
    readonly clientId: string;
}

/**
 * The caller of the `/v1` request being handled, set by the api's
 * `RequireAccess` implementation for both bearer tokens and the first-party
 * session cookie. `undefined` outside a guarded endpoint.
 */
export const CurrentCaller = Context.Reference<Caller | undefined>("@tinyburg/tinyburg.app/server/CurrentCaller", {
    defaultValue: () => undefined,
});

/**
 * The current caller. A guarded handler always has one, so its absence is a
 * wiring bug rather than a client error, and dies.
 */
export const requireCaller: Effect.Effect<Caller> = Effect.gen(function* () {
    const caller = yield* CurrentCaller;
    if (caller === undefined) return yield* Effect.die(new Error("requireCaller ran outside a RequireAccess endpoint"));
    return caller;
});
