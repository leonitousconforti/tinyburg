/**
 * The study's window onto other people's towers.
 *
 * social-circles never holds a Nimblebit auth key. It holds an OAuth grant
 * against tinyburg.app, and tinyburg.app (which does hold the key, and which
 * verified the player actually owns it) performs the pull. That is the whole
 * reason "sign in with tinyburg" was worth building: it replaces "the study bot
 * must be your in-game friend" with a scoped, revocable, auditable grant, and
 * removes the friend-list cap that put a hard ceiling on the old design.
 *
 * ## Tokens
 *
 * Two tokens with two jobs. The browser session carries a short-lived access
 * token, which is what the dashboard uses while the visitor is present. The
 * `tower_grants` row holds a refresh token, which is what the scheduled crawl
 * exchanges hours later.
 *
 * The provider rotates refresh tokens and detects reuse, so a stored token is
 * good for exactly one exchange. Losing the replacement means losing the grant,
 * which is why {@link GrantsRepository.upsert} overwrites in place rather than
 * accumulating rows.
 *
 * The remaining narrowing worth doing is upstream: `tinytower:pull_save` still
 * returns a whole save when the study only ever wants the friends list.
 */

import { Config, Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import type { GamePlayerRef } from "../domain/graph.ts";
import type { PlayerId } from "../domain/model.ts";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { Api } from "@tinyburg/trading-sdk/Sdk";

import { seal, unseal } from "../crypto.ts";
import { type GameId, READABLE_GAMES, gameInfo } from "../domain/games.ts";
import { GrantsRepository } from "../domain/grants.ts";

/**
 * The scope the study asks for, re-exported from the game catalog so callers do
 * not have to know it is derived from the list of readable games.
 *
 * Two leaves per game rather than a whole `:read` branch, because the study has
 * no business with snapshots, gifts or visits. A save is still more than the
 * friends list it wants, so there is room for something narrower later.
 */
export { REQUIRED_SCOPE } from "../domain/games.ts";

/**
 * The study asked for a game the trading api does not serve.
 *
 * Distinct from a tower being unavailable: nothing is wrong upstream and
 * retrying will not help, the api simply has no group for this game yet.
 *
 * @since 1.0.0
 * @category Errors
 */
export class GameNotServed extends Schema.Error<GameNotServed>("@tinyburg/social-circles/GameNotServed")({
    _tag: Schema.tag("GameNotServed"),
    game: Schema.String,
    reason: Schema.String,
}) {}

/**
 * The stored grant cannot currently be turned into an access token.
 *
 * @since 1.0.0
 * @category Errors
 */
export class TowerGrantUnusable extends Schema.Error<TowerGrantUnusable>("@tinyburg/social-circles/TowerGrantUnusable")(
    {
        _tag: Schema.tag("TowerGrantUnusable"),
        tinyburgUserId: Schema.String,
        reason: Schema.String,
        /** Whether the grant is dead for good, as opposed to a transient outage. */
        permanent: Schema.Boolean,
    }
) {}

/**
 * A player's tower could not be read.
 *
 * @since 1.0.0
 * @category Errors
 */
export class TowerUnavailable extends Schema.Error<TowerUnavailable>("@tinyburg/social-circles/TowerUnavailable")({
    _tag: Schema.tag("TowerUnavailable"),
    playerId: PlayerIdSchema,
    reason: Schema.String,
}) {}

const tinyburgConfig = Config.all({
    issuer: Config.string("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    clientId: Config.string("TINYBURG_CLIENT_ID").pipe(Config.withDefault("unconfigured")),
    clientSecret: Config.option(Config.redacted("TINYBURG_CLIENT_SECRET")),
});

const TokenResponse = Schema.Struct({
    access_token: Schema.String,
    expires_in: Schema.optional(Schema.Finite),
    scope: Schema.optional(Schema.String),
    refresh_token: Schema.optional(Schema.String),
});

export class TinyburgTowers extends Context.Service<TinyburgTowers>()(
    "@tinyburg/social-circles/services/TinyburgTowers",
    {
        make: Effect.gen(function* () {
            const config = yield* tinyburgConfig;
            const grants = yield* GrantsRepository;
            const httpClient = yield* HttpClient.HttpClient;

            /**
             * Trades a stored refresh token for a short-lived access token.
             *
             * A 400 from the token endpoint means the grant is dead (revoked
             * upstream, or the provider still does not implement the grant
             * type); anything else is treated as transient so a provider blip
             * does not evict every participant from the study.
             */
            const accessTokenFor = Effect.fnUntraced(function* (tinyburgUserId: string) {
                const grant = yield* grants
                    .findLive(tinyburgUserId)
                    .pipe(Effect.catchCause(() => Effect.succeed(Option.none())));

                if (Option.isNone(grant)) {
                    return yield* new TowerGrantUnusable({
                        tinyburgUserId,
                        reason: "no live towers grant is stored for this user",
                        permanent: true,
                    });
                }

                const refreshToken = yield* unseal(grant.value.refreshTokenCiphertext).pipe(
                    Effect.mapError(
                        () =>
                            new TowerGrantUnusable({
                                tinyburgUserId,
                                reason: "stored grant could not be unsealed",
                                permanent: true,
                            })
                    )
                );

                const body = new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: Redacted.value(refreshToken),
                    client_id: config.clientId,
                });
                if (Option.isSome(config.clientSecret)) {
                    body.set("client_secret", Redacted.value(config.clientSecret.value));
                }

                const response = yield* httpClient
                    .execute(
                        HttpClientRequest.post(`${config.issuer}/oauth/token`).pipe(
                            HttpClientRequest.bodyUrlParams(body)
                        )
                    )
                    .pipe(
                        Effect.mapError(
                            (cause) =>
                                new TowerGrantUnusable({
                                    tinyburgUserId,
                                    // Frida's runtime handles are not plain strings; interpolating them here is intentional.
                                    // oxlint-disable-next-line typescript/restrict-template-expressions
                                    reason: `token endpoint unreachable: ${cause}`,
                                    permanent: false,
                                })
                        )
                    );

                if (response.status >= 400) {
                    // 4xx is the provider telling us this grant will never work
                    // again. Retrying it on a schedule would be pure noise.
                    const permanent = response.status < 500;
                    if (permanent) {
                        yield* Effect.ignore(grants.invalidate(tinyburgUserId));
                    }
                    return yield* new TowerGrantUnusable({
                        tinyburgUserId,
                        reason: `token endpoint returned ${response.status}`,
                        permanent,
                    });
                }

                const token = yield* response.json.pipe(
                    Effect.flatMap(Schema.decodeUnknownEffect(TokenResponse)),
                    Effect.mapError(
                        (cause) =>
                            new TowerGrantUnusable({
                                tinyburgUserId,
                                // Frida's runtime handles are not plain strings; interpolating them here is intentional.
                                // oxlint-disable-next-line typescript/restrict-template-expressions
                                reason: `unreadable token response: ${cause}`,
                                permanent: false,
                            })
                    )
                );

                /**
                 * The provider rotates: the token we just spent is now dead and
                 * the response carries its replacement. Storing it is not
                 * optional bookkeeping, it is the difference between a grant
                 * that keeps working and one that trips reuse detection on the
                 * very next crawl and gets its whole family revoked.
                 *
                 * If the store fails we are in the worst spot available (the old
                 * token is spent, the new one is only in memory), so the grant is
                 * marked invalid rather than left to fail confusingly later. The
                 * user reconnects and gets a fresh family.
                 */
                if (token.refresh_token !== undefined) {
                    yield* seal(token.refresh_token).pipe(
                        Effect.flatMap((ciphertext) =>
                            grants.upsert({
                                tinyburgUserId,
                                refreshTokenCiphertext: ciphertext,
                                scope: token.scope ?? grant.value.scope,
                            })
                        ),
                        Effect.catchCause((cause) =>
                            Effect.andThen(
                                Effect.logError("could not store a rotated refresh token, invalidating grant", cause),
                                Effect.ignore(grants.invalidate(tinyburgUserId))
                            )
                        )
                    );
                }

                return token.access_token;
            });

            /**
             * `makeWith` rather than `make` so the `HttpClient` captured when
             * this layer was built is the one used. `make` would re-require it
             * from context on every call, which pushes the dependency out into
             * every caller's type instead of keeping it an implementation
             * detail of this service.
             */
            const clientFor = (accessToken: string) =>
                HttpApiClient.makeWith(Api, {
                    baseUrl: config.issuer,
                    httpClient: HttpClient.mapRequest(httpClient, HttpClientRequest.bearerToken(accessToken)),
                });

            /**
             * The trading api's groups for one game.
             *
             * The api exposes a pair of groups per game and both have the same
             * shape, but they are separate properties on the derived client, so
             * something has to turn a game id into the right pair. This is that
             * something, and it is the one place that knows which games the api
             * actually serves today.
             *
             * The six games beyond TinyTower and Classic have their groups
             * defined in `@tinyburg/trading-sdk` but not yet added to `Api`, so
             * there is nothing here to return for them.
             */
            const groupsFor = (client: Effect.Success<ReturnType<typeof clientFor>>, game: GameId) => {
                switch (game) {
                    case "tinytower": {
                        return Option.some({
                            accounts: client.TinyTowerAccountsGroup,
                            tower: client.TinyTowerGroup,
                        });
                    }
                    case "tinytowerclassic": {
                        return Option.some({
                            accounts: client.TinyTowerClassicAccountsGroup,
                            tower: client.TinyTowerClassicGroup,
                        });
                    }
                    default: {
                        return Option.none<{
                            accounts: typeof client.TinyTowerAccountsGroup;
                            tower: typeof client.TinyTowerGroup;
                        }>();
                    }
                }
            };

            /**
             * Every account a user has proven they own, in every game the study
             * can read, using a token the caller already holds.
             *
             * This is the ownership check the old Google Form could not make. A
             * consent request for a tower that is not in this list is somebody
             * trying to enroll an account that is not theirs.
             *
             * One request per readable game. A game whose accounts group the api
             * does not serve is skipped rather than failing the lot: the visitor
             * should still see the towers that *can* be listed, and a game the
             * study cannot read has nothing to contribute anyway.
             *
             * Taking the token as an argument is what lets the dashboard work
             * today: a signed-in visitor's session carries a live access token,
             * so the interactive path does not have to wait for the provider to
             * support refresh tokens. Background work goes through
             * {@link linkedPlayers}, which does.
             */
            const linkedPlayersWith = Effect.fnUntraced(function* (options: {
                readonly tinyburgUserId: string;
                readonly accessToken: string;
            }) {
                const client = yield* clientFor(options.accessToken);

                const perGame = yield* Effect.forEach(READABLE_GAMES, (game) =>
                    Option.match(groupsFor(client, game.id), {
                        onNone: () => Effect.succeed<ReadonlyArray<GamePlayerRef>>([]),
                        onSome: (groups) =>
                            groups.accounts.ListAccounts().pipe(
                                Effect.map((linked) =>
                                    linked.map(({ playerId }): GamePlayerRef => ({ game: game.id, playerId }))
                                ),
                                Effect.mapError(
                                    (cause) =>
                                        new TowerGrantUnusable({
                                            tinyburgUserId: options.tinyburgUserId,
                                            // Frida's runtime handles are not plain strings; interpolating them here is intentional.
                                            // oxlint-disable-next-line typescript/restrict-template-expressions
                                            reason: `could not list linked ${game.name} accounts: ${cause}`,
                                            permanent: false,
                                        })
                                )
                            ),
                    })
                );

                return perGame.flat();
            });

            /** {@link linkedPlayersWith}, sourcing the token from the stored grant. */
            const linkedPlayers = Effect.fnUntraced(function* (tinyburgUserId: string) {
                const accessToken = yield* accessTokenFor(tinyburgUserId);
                return yield* linkedPlayersWith({ tinyburgUserId, accessToken });
            });

            /**
             * Pulls a tower's save through the provider.
             *
             * Returns the raw save string; decoding into a friends list is the
             * game catalog's job so this stays a thin transport seam.
             */
            const pullSave = Effect.fnUntraced(function* (options: {
                readonly tinyburgUserId: string;
                readonly game: GameId;
                readonly playerId: PlayerId;
            }) {
                const accessToken = yield* accessTokenFor(options.tinyburgUserId);
                const client = yield* clientFor(accessToken);

                const groups = yield* Option.match(groupsFor(client, options.game), {
                    onNone: () =>
                        new GameNotServed({
                            game: options.game,
                            reason: `the trading api has no group for ${gameInfo[options.game].name}`,
                        }),
                    onSome: Effect.succeed,
                });

                return yield* groups.tower.PullSave({ params: { playerId: options.playerId } }).pipe(
                    Effect.map((save) => save.data),
                    Effect.mapError(
                        (cause) =>
                            new TowerUnavailable({
                                playerId: options.playerId,
                                // Frida's runtime handles are not plain strings; interpolating them here is intentional.
                                // oxlint-disable-next-line typescript/restrict-template-expressions
                                reason: `pull failed: ${cause}`,
                            })
                    )
                );
            });

            /**
             * Asks the provider to drop our grant. Best effort: the caller has
             * already deleted its own copy, which is what actually stops us.
             */
            const revokeGrant = Effect.fnUntraced(function* (tinyburgUserId: string) {
                const grant = yield* grants.findLive(tinyburgUserId);
                if (Option.isNone(grant)) return;
                const refreshToken = yield* unseal(grant.value.refreshTokenCiphertext);
                const body = new URLSearchParams({
                    token: Redacted.value(refreshToken),
                    client_id: config.clientId,
                });
                yield* httpClient.execute(
                    HttpClientRequest.post(`${config.issuer}/oauth/revoke`).pipe(HttpClientRequest.bodyUrlParams(body))
                );
            });

            return {
                accessTokenFor,
                linkedPlayers,
                linkedPlayersWith,
                pullSave,
                revokeGrant,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(TinyburgTowers, TinyburgTowers.make);
}
