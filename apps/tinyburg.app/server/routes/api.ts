import { DateTime, Duration, Effect, Layer, Option, Schema } from "effect";
import { Headers, HttpRouter, HttpServerRequest } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { Model } from "effect/unstable/schema";

import type { Session, User } from "../../domain/models.ts";

import { Api } from "@tinyburg/trading-sdk/Sdk";
import { Oidc, ResourceServer, Jwt } from "effect-oidc";

import { DevelopersRepository } from "../../domain/developers.ts";
import { OidcRepository } from "../../domain/oidc.ts";
import { SessionsRepository } from "../../domain/sessions.ts";
import { OidcKeys } from "../keys.ts";

const accessTokenFor = Effect.fnUntraced(function* ({ session, user }: { session: Session; user: User }) {
    const keys = yield* OidcKeys;
    const now = yield* DateTime.now;

    /** A token this close to expiring is replaced rather than reused. */
    const REFRESH_SKEW = Duration.minutes(1);

    /** Everything the first-party app is allowed to do on the visitor's behalf. */
    const SESSION_SCOPE = "openid profile towers";

    /** The time-to-live for the access token, in seconds. */
    const ACCESS_TOKEN_TTL_SECONDS = 900;

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
        clientId: DevelopersRepository.FIRST_PARTY_CLIENT_ID,
        scope: SESSION_SCOPE,
        ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    });

    const claims = yield* Schema.decodeEffect(Schema.fromJsonString(Jwt.StandardClaimsSchema))(
        accessToken.split(".")[1]
    );

    yield* SessionsRepository.use((repo) =>
        repo.storeAccessToken({
            ...session,
            accessToken: Option.some(accessToken),
            accessTokenJti: Option.fromNullishOr(claims.jti),
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
                if (Headers.has(request.headers, "authorization")) {
                    return yield* httpEffect;
                }

                const maybeCurrentUser = yield* SessionsRepository.maybeCurrentUser;
                if (Option.isNone(maybeCurrentUser)) return yield* httpEffect;

                const accessToken = yield* Effect.orDie(accessTokenFor(maybeCurrentUser.value));
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
