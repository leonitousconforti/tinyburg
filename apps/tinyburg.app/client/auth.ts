import { DateTime, Effect, Option, Schema as S } from "effect";
import { UrlParams } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

import { FIRST_PARTY_CLIENT_ID, FIRST_PARTY_REDIRECT_PATH } from "../firstParty.ts";

const CLIENT_ID = FIRST_PARTY_CLIENT_ID;
const REDIRECT_PATH = FIRST_PARTY_REDIRECT_PATH;

export const SCOPES = ["openid", "profile", "towers"] as const;

/**
 * The PKCE verifier and state have to survive a full-page redirect through
 * the provider, so they live in sessionStorage for the length of one sign-in
 * and are cleared as soon as the callback consumes them. Neither is a
 * credential on its own: the verifier is only useful with the matching code.
 */
const PENDING_KEY = "tinyburg.oauth.pending";

const Pending = S.Struct({
    verifier: S.String,
    state: S.String,
    nonce: S.String,
    returnTo: S.String,
});
type Pending = typeof Pending.Type;

const storePending = (pending: Pending): Effect.Effect<void, S.SchemaError> =>
    Effect.flatMap(S.encodeEffect(S.fromJsonString(Pending))(pending), (json) =>
        Effect.sync(() => window.sessionStorage.setItem(PENDING_KEY, json))
    );

const takePending: Effect.Effect<Option.Option<Pending>> = Effect.gen(function* () {
    const raw = yield* Effect.sync(() => window.sessionStorage.getItem(PENDING_KEY));
    yield* Effect.sync(() => window.sessionStorage.removeItem(PENDING_KEY));
    if (raw === null) return Option.none();
    return yield* S.decodeUnknownEffect(S.fromJsonString(Pending))(raw).pipe(Effect.option);
});

const randomString = (): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");

const origin = (): string => window.location.origin;

/** Who the access token belongs to, read from the id token's claims. */
export const Account = S.Struct({
    id: S.String,
    displayName: S.String,
    avatarUrl: S.Option(S.String),
});
export type Account = typeof Account.Type;

/** An access token and the account it was issued for. */
export const Credentials = S.Struct({
    accessToken: S.String,
    expiresAt: S.DateTimeUtc,
    account: Account,
});
export type Credentials = typeof Credentials.Type;

/**
 * Starts the authorization code flow. The browser leaves the SPA; if the
 * provider session cookie is still valid the round trip is invisible,
 * otherwise the provider asks the visitor to sign in with Google or Discord.
 */
export const beginAuthorization = (returnTo: string): Effect.Effect<void, S.SchemaError> =>
    Effect.gen(function* () {
        const pkce = yield* Oidc.generatePkce();
        const state = randomString();
        const nonce = randomString();

        yield* storePending({ verifier: pkce.verifier, state, nonce, returnTo });

        const request = Oidc.authorizationRequest({
            authorizationEndpoint: `${origin()}/oauth/authorize`,
            clientId: CLIENT_ID,
            redirectUri: `${origin()}${REDIRECT_PATH}`,
            scopes: SCOPES,
            state,
            nonce,
            codeChallenge: pkce.challenge,
        });

        // The request keeps its query separate from `url`, so a browser
        // redirect has to put the two back together.
        const query = UrlParams.toString(request.urlParams);
        const authorizationUrl = query === "" ? request.url : `${request.url}?${query}`;

        yield* Effect.sync(() => window.location.assign(authorizationUrl));
    });

export class CallbackError extends S.ErrorClass<CallbackError>("CallbackError")({
    _tag: S.tag("CallbackError"),
    message: S.String,
}) {}

/**
 * Completes the flow: checks the state, exchanges the code for tokens, and
 * verifies the id token against the provider's JWKS before trusting a single
 * claim in it.
 */
export const completeAuthorization = (search: string) =>
    Effect.gen(function* () {
        const params = new URLSearchParams(search);

        const error = params.get("error");
        if (error !== null) {
            return yield* new CallbackError({
                message: error === "access_denied" ? "You cancelled the sign in." : `Sign in failed (${error}).`,
            });
        }

        const code = params.get("code");
        const state = params.get("state");
        const pending = yield* takePending;

        if (code === null || state === null || Option.isNone(pending)) {
            return yield* new CallbackError({ message: "This sign in link is incomplete. Please try again." });
        }
        if (pending.value.state !== state) {
            return yield* new CallbackError({ message: "This sign in could not be verified. Please try again." });
        }

        const tokens = yield* Oidc.exchangeAuthorizationCode({
            tokenEndpoint: `${origin()}/oauth/token`,
            clientId: CLIENT_ID,
            code,
            codeVerifier: pending.value.verifier,
            redirectUri: `${origin()}${REDIRECT_PATH}`,
        }).pipe(Effect.mapError(() => new CallbackError({ message: "We couldn't finish signing you in." })));

        if (tokens.id_token === undefined) {
            return yield* new CallbackError({ message: "The provider did not return an identity token." });
        }

        const jwks = yield* Oidc.fetchJwks(`${origin()}/.well-known/jwks.json`).pipe(
            Effect.mapError(() => new CallbackError({ message: "We couldn't verify your identity token." }))
        );

        const claims = yield* Oidc.verifyIdToken({
            idToken: tokens.id_token,
            jwks,
            issuer: origin(),
            clientId: CLIENT_ID,
            nonce: pending.value.nonce,
        }).pipe(Effect.mapError(() => new CallbackError({ message: "We couldn't verify your identity token." })));

        const now = yield* DateTime.now;
        const credentials: Credentials = {
            accessToken: tokens.access_token,
            expiresAt: DateTime.addDuration(now, `${tokens.expires_in} seconds`),
            account: {
                id: claims.sub,
                displayName: claims.name ?? "Mayor",
                avatarUrl: Option.fromNullishOr(claims.picture),
            },
        };

        return { credentials, returnTo: pending.value.returnTo } as const;
    });

/** True once the token is within a minute of expiring. */
export const isExpired = (credentials: Credentials, now: DateTime.Utc): boolean =>
    DateTime.toEpochMillis(credentials.expiresAt) <= DateTime.toEpochMillis(DateTime.addDuration(now, "1 minute"));
