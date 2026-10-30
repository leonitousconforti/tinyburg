import { Context, Effect } from "effect";

import * as TradingScopes from "@tinyburg/trading-sdk/Scopes";
import * as OAuthScope from "@yielded/auth/OAuthScope";
import * as OAuthServer from "@yielded/auth/OAuthServer";

/**
 * The scope a client asks for when it needs to act while the user is away.
 * A client registered with it is issued refresh tokens.
 */
export const OFFLINE_ACCESS = OAuthScope.make("offline_access");

/**
 * Every scope the provider declares beyond the OpenID ones: `offline_access`,
 * and every node of the game scope tree in `@tinyburg/trading-sdk`, read off
 * it rather than listed again here so a scope an endpoint accepts is always
 * one a client may ask for.
 */
export const APPLICATION_SCOPES: ReadonlyArray<OAuthScope.OAuthScope> = [
    OFFLINE_ACCESS,
    ...TradingScopes.all().map((scope) => scope.name),
];

/**
 * The Tinyburg OAuth server: its routes live under `/oauth/tinyburg/...`, and
 * `makeOpenId` declares `openid`, `profile` and `email` alongside
 * {@link APPLICATION_SCOPES}.
 */
export const TinyburgOAuth = OAuthServer.makeOpenId("tinyburg", { scopes: APPLICATION_SCOPES });

/** Every scope a client may register for: the OpenID ones it uses, and {@link APPLICATION_SCOPES}. */
export const SUPPORTED_SCOPES: ReadonlyArray<string> = ["openid", "profile", ...APPLICATION_SCOPES];

/** Everything the first-party app may do on the visitor's behalf with its session cookie. */
export const FIRST_PARTY_SCOPES: ReadonlySet<string> = new Set(["openid", "profile", "tinytower", "tinytowerclassic"]);

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
