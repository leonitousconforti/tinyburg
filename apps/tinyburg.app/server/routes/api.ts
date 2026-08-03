import { Effect, Layer } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { Api } from "@tinyburg/trading-sdk/Sdk";
import { ResourceServer } from "effect-oidc";

import { OIDCRepository } from "../../domain/oidc.ts";
import { TinyTowerAccountsRepository } from "../../domain/tinytower.ts";
import { OidcKeys } from "../keys.ts";

/**
 * Bearer authentication for the trading api. Tokens are verified statelessly
 * against our own JWKS; the only state consulted is the RFC 7009 denylist the
 * revocation endpoint writes.
 */
export const AuthorizationLive = Layer.unwrap(
    Effect.map(OidcKeys, (keys) =>
        ResourceServer.layer({
            issuer: keys.issuer,
            audience: keys.issuer,
            algorithms: ["ES256"],
            revoked: (claims) =>
                claims.jti === undefined
                    ? Effect.succeed(false)
                    : OIDCRepository.use((repo) => repo.isTokenRevoked(claims.jti as string)),
        })
    )
);

const LinkedTinyTowerAccountsGroupLive = HttpApiBuilder.group(
    Api,
    "LinkedTinyTowerAccountsGroup",
    Effect.fnUntraced(function* (handlers) {
        const accounts = yield* TinyTowerAccountsRepository;
        const provideAccounts = Effect.provideService(TinyTowerAccountsRepository, accounts);

        return (
            handlers
                .handle(
                    "TinyburgLinkedTinyTowerAccountsList",
                    Effect.fnUntraced(
                        function* () {
                            const user = yield* ResourceServer.CurrentUser;
                            const linked = yield* TinyTowerAccountsRepository.use((repo) => repo.listForUser(user.sub));
                            return linked.map((account) => ({
                                playerId: account.playerId,
                                createdAt: account.createdAt,
                            }));
                        },
                        provideAccounts,
                        Effect.orDie
                    )
                )
                .handle(
                    "TinyburgLinkedTinyTowerAccountsUnlink",
                    Effect.fnUntraced(
                        function* ({ params }: { readonly params: { readonly friendCode: string } }) {
                            const user = yield* ResourceServer.CurrentUser;
                            yield* TinyTowerAccountsRepository.use((repo) =>
                                repo.unlink({ userId: user.sub, playerId: params.friendCode })
                            );
                        },
                        provideAccounts,
                        Effect.orDie
                    )
                )
                // Linking needs Nimblebit's device verification, which the sdk
                // only exposes for its own authenticated player today.
                .handle("TinyburgLinkedTinyTowerAccountsLink", () => Effect.fail(new HttpApiError.NotImplemented()))
                .handle("TinyburgLinkedTinyTowerAccountsVerify", () => Effect.fail(new HttpApiError.NotImplemented()))
        );
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
    Layer.provide(AuthorizationLive)
);
