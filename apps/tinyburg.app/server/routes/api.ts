import { DateTime, Duration, Effect, Encoding, Layer, Option, Redacted, Schema } from "effect";
import { Headers, HttpClient, HttpRouter, HttpServerRequest } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { Model } from "effect/unstable/schema";

import type { Session, User } from "../../domain/models.ts";
import type { GameAccountsRepository } from "../../domain/tinytower.ts";
import type { PlayerAuthKeySchema, PlayerEmailSchema, PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import type { NimblebitGame as NimblebitGame } from "@tinyburg/nimblebit-sdk/NimblebitGame";
import type { ItemToSend, SaveUpload } from "@tinyburg/trading-sdk/Sdk";

import { NimblebitAuth, NimblebitError } from "@tinyburg/nimblebit-sdk";
import { TinyTowerClassic } from "@tinyburg/tinytower-classic-sdk";
import { Bitizens, type Endpoints, TinyTower } from "@tinyburg/tinytower-sdk";
import { Jwt, Oidc, ResourceServer } from "effect-oidc";

import { DevelopersRepository } from "../../domain/developers.ts";
import { OidcRepository } from "../../domain/oidc.ts";
import { SessionsRepository } from "../../domain/sessions.ts";
import { TinyTowerAccountsRepository, TinyTowerClassicAccountsRepository } from "../../domain/tinytower.ts";
import { Api } from "../../shared/api.ts";
import { CookiePolicy, maybeCurrentUser } from "../cookies.ts";
import { OidcKeys } from "../keys.ts";

const accessTokenFor = Effect.fnUntraced(function* ({ session, user }: { session: Session; user: User }) {
    const keys = yield* OidcKeys;
    const now = yield* DateTime.now;

    /** A token this close to expiring is replaced rather than reused. */
    const REFRESH_SKEW = Duration.minutes(1);

    /** Everything the first-party app is allowed to do on the visitor's behalf. */
    const SESSION_SCOPE = "openid profile tinytower tinytowerclassic";

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

    const claims = yield* Effect.fromResult(Encoding.decodeBase64UrlString(accessToken.split(".")[1])).pipe(
        Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(Jwt.StandardClaimsSchema)))
    );

    yield* SessionsRepository.use((repo) =>
        repo.storeAccessToken({
            // The payload is serialized before it leaves this call, so the class prototype is irrelevant.
            // oxlint-disable-next-line typescript/no-misused-spread
            ...session,
            accessToken: Option.some(accessToken),
            accessTokenJti: Option.fromNullishOr(claims.jti),
            accessTokenExpiresAt: Option.some(DateTime.addDuration(now, Duration.seconds(ACCESS_TOKEN_TTL_SECONDS))),
            lastSeenAt: now.pipe(Model.Override),
        })
    );

    return accessToken;
});

const SessionBearer = HttpRouter.middleware(
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        const cookiePolicy = yield* CookiePolicy;
        const keys = yield* OidcKeys;

        return Effect.fnUntraced(
            function* (httpEffect) {
                const request = yield* HttpServerRequest.HttpServerRequest;
                if (Headers.has(request.headers, "authorization")) {
                    return yield* httpEffect;
                }

                const currentUser = yield* maybeCurrentUser;
                if (Option.isNone(currentUser)) return yield* httpEffect;

                const accessToken = yield* accessTokenFor(currentUser.value).pipe(Effect.option);
                if (Option.isNone(accessToken)) return yield* httpEffect;

                return yield* Effect.provideService(
                    httpEffect,
                    HttpServerRequest.HttpServerRequest,
                    request.modify({
                        headers: Headers.set(request.headers, "authorization", `Bearer ${accessToken.value}`),
                    })
                );
            },
            Effect.provideService(SessionsRepository, sessions),
            Effect.provideService(CookiePolicy, cookiePolicy),
            Effect.provideService(OidcKeys, keys)
        );
    })
);

const AuthorizationLive = Layer.unwrap(
    Effect.map(OidcKeys, (keys) =>
        ResourceServer.layer({
            issuer: keys.issuer,
            audience: keys.issuer,
            // The provider lives in this very process, so its keys are already
            // at hand; verifying locally removes the boot-order dependency on
            // the server fetching its own JWKS endpoint over http.
            jwks: keys.jwks,
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

// ---------------------------------------------------------------------------
// One implementation, every game
// ---------------------------------------------------------------------------

type PlayerId = typeof PlayerIdSchema.Type;
type PlayerAuthKey = typeof PlayerAuthKeySchema.Type;
type PlayerEmail = typeof PlayerEmailSchema.Type;

/**
 * What a game's client has to offer for this server to act on its linked
 * accounts: TinyTower's calls, by name. TinyTower Classic's client has the
 * same shape, so both satisfy this by construction.
 */
type GameSdk = Pick<
    typeof TinyTower,
    | "device_registerEmail"
    | "device_verifyDevice"
    | "device_playerDetails"
    | "sync_pullSave"
    | "sync_pushSave"
    | "sync_checkForNewerSave"
    | "sync_retrieveSnapshotList"
    | "sync_pullSnapshot"
    | "sync_pushSnapshot"
    | "raffle_checkEnteredCurrent"
    | "raffle_enterRaffle"
    | "raffle_enterMultiRaffle"
    | "social_getGifts"
    | "social_receiveGift"
    | "social_getVisits"
    | "social_sendItem"
    | "social_visit"
    | "social_pullFriendMeta"
    | "social_pullFriendTower"
    | "social_retrieveFriendsSnapshotList"
>;

/** A game as this server serves it: where its linked accounts live, and how to reach Nimblebit as one. */
interface Game {
    /**
     * Which burn bot pool to draw from. Bots are registered per game and a Tiny
     * Tower bot is not a player in Pocket Planes, so the pool cannot be picked
     * from the sdk alone.
     */
    readonly key: NimblebitGame;
    readonly towers: GameAccountsRepository;
    readonly sdk: GameSdk;
}

/**
 * The pieces every handler that talks to Nimblebit needs: which linked
 * account the caller is acting as, and a way to run a game sdk call with
 * this server's Nimblebit credentials.
 */
const helpersFor = Effect.fnUntraced(function* (game: Game) {
    const nimblebit = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    /**
     * The linked account the caller may act as. A player id the caller has
     * not linked is `404`, whether or not somebody else has: the api never
     * confirms that a tower exists to someone who does not own it.
     */
    const actingAs = (playerId: PlayerId) =>
        Effect.gen(function* () {
            const user = yield* ResourceServer.CurrentUser;
            const account = yield* game.towers.findForUser({ userId: user.sub, playerId }).pipe(Effect.orDie);
            if (Option.isNone(account)) return yield* new HttpApiError.NotFound();
            return { playerId: account.value.playerId, playerAuthKey: account.value.playerAuthKey };
        });

    /**
     * Runs a game sdk call. Whatever goes wrong between here and Nimblebit -
     * unreachable, an answer that did not parse, an error it reported - is
     * `503` to the caller: not their fault, and not this server's either.
     */
    const upstream = <A, E>(
        effect: Effect.Effect<A, E, NimblebitAuth.NimblebitAuth | HttpClient.HttpClient>
    ): Effect.Effect<A, HttpApiError.ServiceUnavailable> =>
        effect.pipe(
            Effect.provideService(NimblebitAuth.NimblebitAuth, nimblebit),
            Effect.provideService(HttpClient.HttpClient, httpClient),
            Effect.mapError(() => new HttpApiError.ServiceUnavailable())
        );

    /**
     * The same, for a call whose Nimblebit error means the caller sent
     * something Nimblebit would not take - a wrong verification code, an
     * email it does not know - which is `400`, not `503`.
     */
    const upstreamOrRefused = <A, E>(
        effect: Effect.Effect<A, E, NimblebitAuth.NimblebitAuth | HttpClient.HttpClient>
    ): Effect.Effect<A, HttpApiError.ServiceUnavailable | HttpApiError.BadRequest> =>
        effect.pipe(
            Effect.provideService(NimblebitAuth.NimblebitAuth, nimblebit),
            Effect.provideService(HttpClient.HttpClient, httpClient),
            Effect.catchIf(NimblebitError.isNimblebitError, () => new HttpApiError.BadRequest()),
            Effect.mapError((error) =>
                error instanceof HttpApiError.BadRequest ? error : new HttpApiError.ServiceUnavailable()
            )
        );

    /**
     * This server's Nimblebit credentials with one burn bot pinned. Nimblebit
     * ties an emailed verification code to the device that asked for it, so
     * asking and presenting have to happen as the same bot, not the random one
     * the credentials pick per call.
     */
    const asBurnBot = (bot: { readonly playerId: PlayerId; readonly playerAuthKey: PlayerAuthKey }) =>
        Effect.provideService(NimblebitAuth.NimblebitAuth, { ...nimblebit, burnbot: () => Effect.succeed(bot) });

    /** A tower's metadata as the api describes it. */
    const towerMeta = (meta: typeof Endpoints.PlayerMetaData.Type) =>
        Effect.map(Schema.encodeEffect(Bitizens.Bitizen)(meta.doorman), (doorman) => ({
            stories: meta.stories,
            maxGold: meta.maxGold,
            requestedFloorId: meta.requestedFloorId,
            vip: meta.vip,
            doorman,
        })).pipe(Effect.orDie);

    /** A save as text, decoded on the way in so a broken one is refused, not sent on. */
    const decodeSave = (data: string) =>
        Schema.decodeEffect(TinyTower.SaveData)(data).pipe(Effect.mapError(() => new HttpApiError.BadRequest()));

    return { ...game, nimblebit, actingAs, upstream, upstreamOrRefused, asBurnBot, towerMeta, decodeSave };
});

type Helpers = Effect.Success<ReturnType<typeof helpersFor>>;

/** A gift or visit as the api describes it: what Nimblebit sent, minus its checksum and the unknown `c`. */
const gift = <
    G extends { readonly id: number; readonly from: PlayerId; readonly to: PlayerId; readonly contents: string },
>(
    item: G & { readonly type: G extends { readonly type: infer T } ? T : never }
) => ({ id: item.id, from: item.from, to: item.to, type: item.type, contents: item.contents });

/**
 * The accounts group, for any game. Each handler is written against what
 * the request carries rather than against one game's group type, which is
 * what lets the same functions serve `TinyTowerAccountsGroup` and
 * `TinyTowerClassicAccountsGroup`.
 */
const accountsHandlers = ({ asBurnBot, key, nimblebit, sdk, towers, upstreamOrRefused }: Helpers) => ({
    ListAccounts: () =>
        Effect.gen(function* () {
            const user = yield* ResourceServer.CurrentUser;
            const accounts = yield* towers.listForUser(user.sub);
            return accounts.map((account) => ({ playerId: account.playerId, createdAt: account.createdAt }));
        }).pipe(Effect.orDie),

    LinkAccount: ({ payload }: { readonly payload: { readonly playerId: PlayerId; readonly email: PlayerEmail } }) =>
        // The early exits return never-typed values; the normal path runs to the end.
        // oxlint-disable-next-line typescript/consistent-return
        Effect.gen(function* () {
            const user = yield* ResourceServer.CurrentUser;

            // One link per tower. Whoever holds it, a second link would
            // let two accounts act as the same player.
            const taken = yield* towers.findByPlayerId(payload.playerId).pipe(Effect.orDie);
            if (Option.isSome(taken)) return yield* new HttpApiError.Conflict();

            // Pick the bot now and remember it: the code Nimblebit
            // emails is only good from this bot.
            const bot = yield* nimblebit.burnbot(key);
            yield* upstreamOrRefused(sdk.device_registerEmail({ playerEmail: payload.email }).pipe(asBurnBot(bot)));

            yield* towers
                .createPending({
                    userId: user.sub,
                    playerId: payload.playerId,
                    playerEmail: payload.email,
                    burnBotPlayerId: bot.playerId,
                    burnBotAuthKey: bot.playerAuthKey,
                })
                .pipe(Effect.orDie);
        }),

    VerifyAccount: ({
        params,
        payload,
    }: {
        readonly params: { readonly playerId: PlayerId };
        readonly payload: { readonly verificationCode: string };
    }) =>
        // The early exits return never-typed values; the normal path runs to the end.
        // oxlint-disable-next-line typescript/consistent-return
        Effect.gen(function* () {
            const user = yield* ResourceServer.CurrentUser;

            const waiting = yield* towers
                .findPending({ userId: user.sub, playerId: params.playerId })
                .pipe(Effect.orDie);
            if (Option.isNone(waiting)) return yield* new HttpApiError.BadRequest();
            const request = waiting.value;

            const verified = yield* upstreamOrRefused(
                sdk
                    .device_verifyDevice({ verificationCode: payload.verificationCode })
                    .pipe(asBurnBot({ playerId: request.burnBotPlayerId, playerAuthKey: request.burnBotAuthKey }))
            );

            // Nimblebit says whose account the email belongs to. If that
            // is not the player the visitor claimed, the claim was wrong,
            // and linking the account the code actually proves would
            // link something nobody asked for.
            if (verified.playerId !== params.playerId) return yield* new HttpApiError.BadRequest();

            const taken = yield* towers.findByPlayerId(verified.playerId).pipe(Effect.orDie);
            if (Option.isSome(taken)) return yield* new HttpApiError.Conflict();

            yield* towers
                .link({
                    userId: user.sub,
                    playerId: verified.playerId,
                    playerAuthKey: verified.playerAuthKey,
                    playerEmail: verified.playerEmail,
                })
                .pipe(Effect.orDie);
            yield* towers.deletePending(request.id).pipe(Effect.orDie);
        }),

    UnlinkAccount: ({ params }: { readonly params: { readonly playerId: PlayerId } }) =>
        // The early exits return never-typed values; the normal path runs to the end.
        // oxlint-disable-next-line typescript/consistent-return
        Effect.gen(function* () {
            const user = yield* ResourceServer.CurrentUser;
            const removed = yield* towers.unlink({ userId: user.sub, playerId: params.playerId }).pipe(Effect.orDie);
            if (!removed) return yield* new HttpApiError.NotFound();
        }),
});

type Acting = { readonly params: { readonly playerId: PlayerId } };
type WithFriend = { readonly params: { readonly playerId: PlayerId; readonly friendId: PlayerId } };

/** The game group, for any game: everything a linked account can do, acting as that account. */
const towerHandlers = ({ actingAs, decodeSave, sdk, towerMeta, upstream }: Helpers) => ({
    PullSave: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const { data, saveId } = yield* upstream(sdk.sync_pullSave(player));
            return { saveId, data };
        }),

    PushSave: ({ params, payload }: Acting & { readonly payload: typeof SaveUpload.Type }) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const data = yield* decodeSave(payload.data);
            yield* upstream(sdk.sync_pushSave({ ...player, data }));
        }),

    CheckVersion: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const saveId = yield* upstream(sdk.sync_checkForNewerSave(player));
            return { saveId };
        }),

    ListSnapshots: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const saves = yield* upstream(sdk.sync_retrieveSnapshotList(player));
            return yield* Effect.forEach(saves, (save) =>
                Effect.map(towerMeta(save.meta), (meta) => ({
                    id: save.id,
                    timestamp: save.timestamp.toString(),
                    meta,
                }))
            );
        }),

    PushSnapshot: ({ params, payload }: Acting & { readonly payload: typeof SaveUpload.Type }) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const data = yield* decodeSave(payload.data);
            yield* upstream(sdk.sync_pushSnapshot({ ...player, data }));
        }),

    PullSnapshot: ({ params }: { readonly params: { readonly playerId: PlayerId; readonly snapshotId: number } }) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const { data, snapshotId } = yield* upstream(
                sdk.sync_pullSnapshot({ ...player, snapshotId: params.snapshotId })
            );
            return { snapshotId, data };
        }),

    CheckRaffle: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const entered = yield* upstream(sdk.raffle_checkEnteredCurrent(player));
            return { entered };
        }),

    EnterRaffle: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            yield* upstream(sdk.raffle_enterRaffle(player));
        }),

    EnterMultiRaffle: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            yield* upstream(sdk.raffle_enterMultiRaffle(player));
        }),

    PlayerDetails: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const details = yield* upstream(sdk.device_playerDetails(player));
            return {
                playerId: details.playerId,
                playerEmail: Redacted.value(details.playerEmail),
                registered: details.registered,
                blacklisted: details.blacklisted,
            };
        }),

    ListGifts: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const { gifts, total } = yield* upstream(sdk.social_getGifts(player));
            return { total, gifts: gifts.map(gift) };
        }),

    ReceiveGift: ({ params }: { readonly params: { readonly playerId: PlayerId; readonly giftId: number } }) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            yield* upstream(sdk.social_receiveGift({ ...player, giftId: params.giftId }));
        }),

    ListVisits: ({ params }: Acting) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const { total, visits } = yield* upstream(sdk.social_getVisits(player));
            return { total, gifts: visits.map(gift) };
        }),

    SendItem: ({ params, payload }: WithFriend & { readonly payload: typeof ItemToSend.Type }) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            yield* upstream(
                sdk.social_sendItem({
                    ...player,
                    friendId: params.friendId,
                    itemStr: payload.item,
                    itemType: payload.itemType,
                })
            );
        }),

    Visit: ({ params }: WithFriend) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            yield* upstream(sdk.social_visit({ ...player, friendId: params.friendId }));
        }),

    FriendMeta: ({ params }: WithFriend) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const meta = yield* upstream(sdk.social_pullFriendMeta({ ...player, friendId: params.friendId }));
            // Nimblebit answers with a map keyed by friend; a friend it
            // does not know is simply absent from it.
            if (meta === undefined) return yield* new HttpApiError.NotFound();
            return yield* towerMeta(meta);
        }),

    FriendSave: ({ params }: WithFriend) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const { data, saveId } = yield* upstream(
                sdk.social_pullFriendTower({ ...player, friendId: params.friendId })
            );
            return { saveId, data };
        }),

    FriendSnapshots: ({ params }: WithFriend) =>
        Effect.gen(function* () {
            const player = yield* actingAs(params.playerId);
            const saves = yield* upstream(
                sdk.social_retrieveFriendsSnapshotList({ ...player, friendId: params.friendId })
            );
            return saves.map((save) => ({
                snapshotId: save.snapshotId,
                created: DateTime.makeUnsafe(save.created),
            }));
        }),
});

// ---------------------------------------------------------------------------
// The games
// ---------------------------------------------------------------------------

const TinyTowerAccountsGroupLive = HttpApiBuilder.group(
    Api,
    "TinyTowerAccountsGroup",
    Effect.fnUntraced(function* (handlers) {
        const h = accountsHandlers(
            yield* helpersFor({ key: "tinytower", towers: yield* TinyTowerAccountsRepository, sdk: TinyTower })
        );
        return handlers
            .handle("ListAccounts", h.ListAccounts)
            .handle("LinkAccount", h.LinkAccount)
            .handle("VerifyAccount", h.VerifyAccount)
            .handle("UnlinkAccount", h.UnlinkAccount);
    })
);

const TinyTowerGroupLive = HttpApiBuilder.group(
    Api,
    "TinyTowerGroup",
    Effect.fnUntraced(function* (handlers) {
        const h = towerHandlers(
            yield* helpersFor({ key: "tinytower", towers: yield* TinyTowerAccountsRepository, sdk: TinyTower })
        );
        return handlers
            .handle("PullSave", h.PullSave)
            .handle("PushSave", h.PushSave)
            .handle("CheckVersion", h.CheckVersion)
            .handle("ListSnapshots", h.ListSnapshots)
            .handle("PushSnapshot", h.PushSnapshot)
            .handle("PullSnapshot", h.PullSnapshot)
            .handle("CheckRaffle", h.CheckRaffle)
            .handle("EnterRaffle", h.EnterRaffle)
            .handle("EnterMultiRaffle", h.EnterMultiRaffle)
            .handle("PlayerDetails", h.PlayerDetails)
            .handle("ListGifts", h.ListGifts)
            .handle("ReceiveGift", h.ReceiveGift)
            .handle("ListVisits", h.ListVisits)
            .handle("SendItem", h.SendItem)
            .handle("Visit", h.Visit)
            .handle("FriendMeta", h.FriendMeta)
            .handle("FriendSave", h.FriendSave)
            .handle("FriendSnapshots", h.FriendSnapshots);
    })
);

const TinyTowerClassicAccountsGroupLive = HttpApiBuilder.group(
    Api,
    "TinyTowerClassicAccountsGroup",
    Effect.fnUntraced(function* (handlers) {
        const h = accountsHandlers(
            yield* helpersFor({
                key: "tinytowerclassic",
                towers: yield* TinyTowerClassicAccountsRepository,
                sdk: TinyTowerClassic,
            })
        );
        return handlers
            .handle("ListAccounts", h.ListAccounts)
            .handle("LinkAccount", h.LinkAccount)
            .handle("VerifyAccount", h.VerifyAccount)
            .handle("UnlinkAccount", h.UnlinkAccount);
    })
);

const TinyTowerClassicGroupLive = HttpApiBuilder.group(
    Api,
    "TinyTowerClassicGroup",
    Effect.fnUntraced(function* (handlers) {
        const h = towerHandlers(
            yield* helpersFor({
                key: "tinytowerclassic",
                towers: yield* TinyTowerClassicAccountsRepository,
                sdk: TinyTowerClassic,
            })
        );
        return handlers
            .handle("PullSave", h.PullSave)
            .handle("PushSave", h.PushSave)
            .handle("CheckVersion", h.CheckVersion)
            .handle("ListSnapshots", h.ListSnapshots)
            .handle("PushSnapshot", h.PushSnapshot)
            .handle("PullSnapshot", h.PullSnapshot)
            .handle("CheckRaffle", h.CheckRaffle)
            .handle("EnterRaffle", h.EnterRaffle)
            .handle("EnterMultiRaffle", h.EnterMultiRaffle)
            .handle("PlayerDetails", h.PlayerDetails)
            .handle("ListGifts", h.ListGifts)
            .handle("ReceiveGift", h.ReceiveGift)
            .handle("ListVisits", h.ListVisits)
            .handle("SendItem", h.SendItem)
            .handle("Visit", h.Visit)
            .handle("FriendMeta", h.FriendMeta)
            .handle("FriendSave", h.FriendSave)
            .handle("FriendSnapshots", h.FriendSnapshots);
    })
);

export const ApiLive = HttpApiBuilder.layer(Api).pipe(
    Layer.provide(TinyTowerAccountsGroupLive),
    Layer.provide(TinyTowerGroupLive),
    Layer.provide(TinyTowerClassicAccountsGroupLive),
    Layer.provide(TinyTowerClassicGroupLive),
    Layer.provide(AuthorizationLive),
    Layer.provide(SessionBearer.layer),
    // This server talks to Nimblebit directly, as the game does, with the
    // linked account's own key: the authproxy is for callers who hold a key
    // of their own, and this is what serves callers who do not. One set of
    // Nimblebit credentials for every game, until a game turns out to need
    // its own.
    Layer.provide(NimblebitAuth.layerDirectConfig())
);
