import { Schema } from "effect";
import { Model } from "effect/unstable/schema";

import { PlayerAuthKeySchema, PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

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
    createdAt: Model.DateTimeInsertFromDate,
}) {}

export class RevokedToken extends Model.Class<RevokedToken>("RevokedToken")({
    expiresAt: Model.DateTimeInsertFromDate,
    jti: Schema.String,
}) {}

export class TinyTowerAccount extends Model.Class<TinyTowerAccount>("TinyTowerAccount")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    playerId: PlayerIdSchema,
    playerAuthKey: PlayerAuthKeySchema,
    playerEmail: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
}) {}

export class PendingTinyTowerAccount extends Model.Class<PendingTinyTowerAccount>("PendingTinyTowerAccount")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    playerId: PlayerIdSchema,
    playerEmail: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Schema.DateTimeUtcFromDate.pipe(Model.GeneratedByDb),
}) {}

export class OAuthClient extends Model.Class<OAuthClient>("OAuthClient")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    ownerUserId: Schema.String.check(Schema.isUUID()),
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
