import { Schema } from "effect";
import { Model } from "effect/schema";

import { PlayerAuthKeySchema, PlayerEmailSchema, PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

export class User extends Model.Class<User>("User")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    createdAt: Model.DateTimeInsertFromDate,
    lastLoginAt: Model.DateTimeUpdateFromDate,
    displayName: Schema.String,
    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
}) {}

export class OAuthAccount extends Model.Class<OAuthAccount>("OAuthAccount")({
    userId: Schema.String.check(Schema.isUUID()),
    provider: Schema.Literals(["google", "discord"]),
    providerAccountId: Schema.String,
    email: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    displayName: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
    lastLoginAt: Model.DateTimeUpdateFromDate,
}) {}

export class Session extends Model.Class<Session>("Session")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    tokenHash: Model.Sensitive(Schema.String.check(Schema.isBase64Url())),
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Schema.DateTimeUtcFromDate,
    lastSeenAt: Model.DateTimeUpdateFromDate,
    userAgent: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    ip: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
}) {}

export class TinyTowerAccount extends Model.Class<TinyTowerAccount>("TinyTowerAccount")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    playerId: PlayerIdSchema,
    playerAuthKey: PlayerAuthKeySchema,
    playerEmail: PlayerEmailSchema,
    createdAt: Model.DateTimeInsertFromDate,
}) {}

export class PendingTinyTowerAccount extends Model.Class<PendingTinyTowerAccount>("PendingTinyTowerAccount")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    expiresAt: Schema.DateTimeUtcFromDate.pipe(Model.GeneratedByDb),
    userId: Schema.String.check(Schema.isUUID()),
    createdAt: Model.DateTimeInsertFromDate,
    burnBotPlayerId: PlayerIdSchema,
    burnBotAuthKey: PlayerAuthKeySchema,
    playerId: PlayerIdSchema,
    playerEmail: PlayerEmailSchema,
}) {}

export class OAuthClient extends Model.Class<OAuthClient>("OAuthClient")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    ownerUserId: Schema.OptionFromNullishOr(Schema.String.check(Schema.isUUID()), { onNoneEncoding: null }),
    name: Schema.String,
    secretHash: Schema.OptionFromNullishOr(Schema.String.check(Schema.isBase64Url()), { onNoneEncoding: null }),
    redirectUris: Schema.NonEmptyArray(Schema.String),
    scope: Schema.String,
    /**
     * The software this client is an installation of (RFC 7591), for clients
     * that registered themselves. Registering again under the same value
     * updates this row rather than making another, which is what lets such a
     * client keep no record of its own registration. None for a client
     * created by hand or by migration.
     */
    softwareId: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
}) {}
