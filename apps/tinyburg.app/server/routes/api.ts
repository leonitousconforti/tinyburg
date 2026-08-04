import { DateTime, Duration, Effect, Layer, Option } from "effect";
import { Headers, HttpRouter, HttpServerRequest } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { Model } from "effect/unstable/schema";

import { Api } from "@tinyburg/trading-sdk/Sdk";
import { Oidc, ResourceServer } from "effect-oidc";

import { OidcRepository } from "../../domain/oidc.ts";
import { SessionsRepository } from "../../domain/sessions.ts";
import { sha256 } from "../crypto.ts";
import { OidcKeys } from "../keys.ts";
import { CurrentUser } from "../providerSession.ts";

const accessTokenFor = Effect.gen(function* () {
    const keys = yield* OidcKeys;
    const now = yield* DateTime.now;
    const { session, user } = yield* CurrentUser;

    /** A token this close to expiring is replaced rather than reused. */
    const REFRESH_SKEW = Duration.minutes(1);

    /** Everything the first-party app is allowed to do on the visitor's behalf. */
    const SESSION_SCOPE = "openid profile towers";

    /** The time-to-live for the access token, in seconds. */
    const ACCESS_TOKEN_TTL_SECONDS = 900;

    /** The first-party app's client id, which is the same as the issuer. */
    const FIRST_PARTY_CLIENT_ID = ""; // FIXME: what should this be?

    const cutoff = DateTime.addDuration(now, REFRESH_SKEW);
    const cached = Option.zipWith(session.accessToken, session.accessTokenExpiresAt, (token, expiresAt) =>
        DateTime.isGreaterThan(expiresAt, cutoff) ? Option.some(token) : Option.none<string>()
    ).pipe(Option.flatten);

    if (Option.isSome(cached)) {
        return cached.value;
    }

    const accessToken = yield* Oidc.issueAccessToken({
        privateJwk: keys.privateJwk,
        issuer: keys.issuer,
        subject: user.id,
        audience: keys.issuer,
        clientId: FIRST_PARTY_CLIENT_ID,
        scope: SESSION_SCOPE,
        ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    });

    const accessTokenJti = Option.none<string>(); // yield* claim(accessToken, "jti"); FIXME: this needs to be fixed
    yield* SessionsRepository.use((repo) =>
        repo.storeAccessToken({
            ...session,
            accessToken: Option.some(accessToken),
            accessTokenJti: accessTokenJti,
            expiresAt: now.pipe(DateTime.addDuration(Duration.seconds(ACCESS_TOKEN_TTL_SECONDS)), Model.Override),
            createdAt: session.createdAt.pipe(Model.Override),
            lastSeenAt: now.pipe(Model.Override),
        })
    );

    return accessToken;
});

const SessionBearer = HttpRouter.middleware(
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        const keys = yield* OidcKeys;

        return Effect.fnUntraced(
            function* (httpEffect) {
                const request = yield* HttpServerRequest.HttpServerRequest;
                if (request.headers.authorization !== undefined) {
                    return yield* httpEffect;
                }

                const cookie = Option.fromNullishOr(request.cookies["provider_session"]);
                if (Option.isNone(cookie)) return yield* httpEffect;

                const tokenHash = yield* sha256(cookie.value);
                const maybeSessionAndUser = yield* SessionsRepository.use((repo) =>
                    repo.findSessionWithUser(tokenHash)
                ).pipe(Effect.catch(() => Effect.succeedNone));

                if (Option.isNone(maybeSessionAndUser)) return yield* httpEffect;
                const accessToken = yield* accessTokenFor.pipe(
                    Effect.provideService(CurrentUser, maybeSessionAndUser.value),
                    Effect.orDie
                );

                return yield* Effect.provideService(
                    httpEffect,
                    HttpServerRequest.HttpServerRequest,
                    request.modify({
                        headers: Headers.set(request.headers, "authorization", `Bearer ${accessToken}`),
                    })
                );
            },
            Effect.provideService(SessionsRepository, sessions),
            Effect.provideService(OidcKeys, keys)
        );
    })
);

const AuthorizationLive = Layer.unwrap(
    Effect.map(OidcKeys, (keys) =>
        ResourceServer.layer({
            issuer: keys.issuer,
            audience: keys.issuer,
            algorithms: ["ES256"],
            revoked: (claims) =>
                OidcRepository.use((repo) => {
                    if (claims.jti === undefined) {
                        return Effect.succeed(false);
                    } else {
                        return repo.isTokenRevoked(claims.jti);
                    }
                }),
        })
    )
);

const LinkedTinyTowerAccountsGroupLive = HttpApiBuilder.group(
    Api,
    "LinkedTinyTowerAccountsGroup",
    Effect.fnUntraced(function* (handlers) {
        const notImplemented = () => Effect.fail(new HttpApiError.NotImplemented());
        return handlers
            .handle("TinyburgLinkedTinyTowerAccountsList", notImplemented)
            .handle("TinyburgLinkedTinyTowerAccountsUnlink", notImplemented)
            .handle("TinyburgLinkedTinyTowerAccountsLink", notImplemented)
            .handle("TinyburgLinkedTinyTowerAccountsVerify", notImplemented);
    })
);

const TinyTowerGroupLive = HttpApiBuilder.group(
    Api,
    "TinyTowerGroup",
    Effect.fnUntraced(function* (handlers) {
        const notImplemented = () => Effect.fail(new HttpApiError.NotImplemented());
        return handlers
            .handle("TinyTowerSyncPullSave", notImplemented)
            .handle("TinyTowerSyncPushSave", notImplemented)
            .handle("TinyTowerRaffleCheckEnteredCurrent", notImplemented)
            .handle("TinyTowerRaffleEnter", notImplemented)
            .handle("TinyTowerRaffleEnterMulti", notImplemented);
    })
);

export const ApiLive = HttpApiBuilder.layer(Api).pipe(
    Layer.provide(LinkedTinyTowerAccountsGroupLive),
    Layer.provide(TinyTowerGroupLive),
    Layer.provide(AuthorizationLive),
    Layer.provide(SessionBearer.layer)
);
