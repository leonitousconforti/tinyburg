import { Schema } from "effect";
import { Model } from "effect/unstable/schema";

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

export class RevokedToken extends Model.Class<RevokedToken>("RevokedToken")({
    expiresAt: Model.DateTimeInsertFromDate,
    jti: Schema.String,
}) {}

export class Session extends Model.Class<Session>("Session")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    tokenHash: Model.Sensitive(Schema.String),
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Model.DateTimeInsertFromDate,
    lastSeenAt: Model.DateTimeInsertFromDate,
    userAgent: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    ip: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    accessToken: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }).pipe(
        Model.FieldExcept(["insert"])
    ),
    accessTokenExpiresAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }).pipe(
        Model.FieldExcept(["insert"])
    ),
    accessTokenJti: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }).pipe(
        Model.FieldExcept(["insert"])
    ),
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
    userId: Schema.String.check(Schema.isUUID()),
    playerId: PlayerIdSchema,
    playerEmail: PlayerEmailSchema,
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Schema.DateTimeUtcFromDate.pipe(Model.GeneratedByDb),
}) {}

export class OAuthClient extends Model.Class<OAuthClient>("OAuthClient")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    ownerUserId: Schema.OptionFromNullishOr(Schema.String.check(Schema.isUUID()), { onNoneEncoding: null }),
    name: Schema.String,
    secretHash: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    redirectUris: Schema.Array(Schema.String),
    scope: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
}) {}

export class OAuthAuthorizationRequest extends Model.Class<OAuthAuthorizationRequest>("OAuthAuthorizationRequest")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    clientId: Schema.String.check(Schema.isUUID()),
    userId: Schema.String.check(Schema.isUUID()),
    redirectUri: Schema.String,
    scope: Schema.String,
    state: Schema.String,
    nonce: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    codeChallenge: Schema.String,
    codeHash: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Schema.DateTimeUtcFromDate.pipe(Model.GeneratedByDb),
}) {}

export class OAuthConsent extends Model.Class<OAuthConsent>("OAuthConsent")({
    userId: Schema.String.check(Schema.isUUID()),
    clientId: Schema.String.check(Schema.isUUID()),
    scope: Schema.String,
    grantedAt: Model.DateTimeInsertFromDate,
}) {}
