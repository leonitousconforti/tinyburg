/**
 * @since 1.0.0
 */

import * as Schema from "effect/Schema";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { ResourceServer } from "effect-oidc";

const TinyburgLinkedTinyTowerAccountsList = HttpApiEndpoint.get(
    "TinyburgLinkedTinyTowerAccountsList",
    "/v1/tinytower/linkedAccounts/list",
    {
        error: HttpApiError.NotImplemented,
        success: Schema.Array(
            Schema.Struct({
                playerId: NimblebitConfig.PlayerIdSchema,
                createdAt: Schema.DateTimeUtcFromString,
            })
        ),
    }
);

const TinyburgLinkedTinyTowerAccountsUnlink = HttpApiEndpoint.delete(
    "TinyburgLinkedTinyTowerAccountsUnlink",
    "/v1/tinytower/linkedAccounts/unlink/:friendCode",
    {
        success: Schema.Void,
        error: HttpApiError.NotImplemented,
        params: {
            friendCode: NimblebitConfig.PlayerIdSchema,
        },
    }
);

const TinyburgLinkedTinyTowerAccountsLink = HttpApiEndpoint.post(
    "TinyburgLinkedTinyTowerAccountsLink",
    "/v1/tinytower/linkedAccounts/link",
    {
        success: Schema.Void,
        error: HttpApiError.NotImplemented,
        payload: Schema.Struct({
            friendCode: NimblebitConfig.PlayerIdSchema,
            email: NimblebitConfig.PlayerEmailSchema,
        }).pipe(HttpApiSchema.asFormUrlEncoded()),
        params: {
            friendCode: NimblebitConfig.PlayerIdSchema,
            email: NimblebitConfig.PlayerEmailSchema,
        },
    }
);

const TinyburgLinkedTinyTowerAccountsVerify = HttpApiEndpoint.post(
    "TinyburgLinkedTinyTowerAccountsVerify",
    "/v1/tinytower/linkedAccounts/verify",
    {
        success: Schema.Void,
        error: HttpApiError.NotImplemented,
        payload: Schema.Struct({
            friendCode: NimblebitConfig.PlayerIdSchema,
            verificationCode: Schema.String,
        }).pipe(HttpApiSchema.asFormUrlEncoded()),
        params: {
            friendCode: NimblebitConfig.PlayerIdSchema,
            verificationCode: Schema.String,
        },
    }
);

const TinyTowerSyncPullSave = HttpApiEndpoint.get("TinyTowerSyncPullSave", "/v1/tinytower/sync/download/:friendCode", {
    params: { friendCode: NimblebitConfig.PlayerIdSchema },
    success: Schema.String,
    error: HttpApiError.NotImplemented,
});

const TinyTowerSyncPushSave = HttpApiEndpoint.post("TinyTowerSyncPushSave", "/v1/tinytower/sync/upload/:friendCode", {
    params: { friendCode: NimblebitConfig.PlayerIdSchema },
    payload: Schema.String,
    success: Schema.Void,
    error: HttpApiError.NotImplemented,
});

const TinyTowerRaffleCheckEnteredCurrent = HttpApiEndpoint.get(
    "TinyTowerRaffleCheckEnteredCurrent",
    "/v1/tinytower/raffle/check/:friendCode",
    {
        params: { friendCode: NimblebitConfig.PlayerIdSchema },
        success: Schema.Boolean,
        error: HttpApiError.NotImplemented,
    }
);

const TinyTowerRaffleEnter = HttpApiEndpoint.post("TinyTowerRaffleEnter", "/v1/tinytower/raffle/enter/:friendCode", {
    params: { friendCode: NimblebitConfig.PlayerIdSchema },
    success: Schema.Void,
    error: HttpApiError.NotImplemented,
});

const TinyTowerRaffleEnterMulti = HttpApiEndpoint.post(
    "TinyTowerRaffleEnterMulti",
    "/v1/tinytower/raffle/enterMulti/:friendCode",
    {
        params: { friendCode: NimblebitConfig.PlayerIdSchema },
        success: Schema.Void,
        error: HttpApiError.NotImplemented,
    }
);

/**
 * The scope guarding a player's towers. Signing someone in is not enough to
 * touch their towers: an application has to be granted this on top of
 * `openid`/`profile`, and the player approves it on the consent screen.
 *
 * Grants both reading and writing. Prefer {@link TOWERS_READ_SCOPE} or
 * {@link TOWERS_WRITE_SCOPE}, which say which half an application actually
 * needs; this one stays accepted so tokens and clients registered before the
 * split keep working.
 *
 * @since 1.0.0
 */
export const TOWERS_SCOPE = "towers";

/**
 * Read-only access to a player's towers: pulling a save, listing linked
 * accounts, checking raffle entry.
 *
 * Exists because `towers` was too coarse to grant honestly. An application that
 * only wants to look at a friends list should not also be able to overwrite the
 * tower, and until this split there was no way for a player to grant the one
 * without the other.
 *
 * @since 1.0.0
 */
export const TOWERS_READ_SCOPE = "towers:read";

/**
 * Write access to a player's towers: pushing a save, entering raffles, linking
 * and unlinking accounts.
 *
 * Deliberately not implied by {@link TOWERS_READ_SCOPE}. An application that
 * needs both asks for both, so the consent screen can say so plainly.
 *
 * @since 1.0.0
 */
export const TOWERS_WRITE_SCOPE = "towers:write";

/**
 * Endpoints are annotated individually rather than by group, because the
 * read/write divide cuts across both groups: listing linked accounts and
 * linking a new one live together but are not the same kind of permission.
 *
 * A token needs *one of* the listed scopes, so the legacy umbrella keeps
 * working alongside the narrower ones.
 */
const READ_SCOPES = [TOWERS_READ_SCOPE, TOWERS_SCOPE];
const WRITE_SCOPES = [TOWERS_WRITE_SCOPE, TOWERS_SCOPE];

// Every endpoint is bearer authenticated: callers present an access token
// minted by the Tinyburg OIDC provider, whether that is the first-party app,
// a third-party application, or a long-lived api key.
const LinkedTinyTowerAccountsGroup = HttpApiGroup.make("LinkedTinyTowerAccountsGroup")
    .add(TinyburgLinkedTinyTowerAccountsList.annotate(ResourceServer.OIDCScopes, READ_SCOPES))
    .add(TinyburgLinkedTinyTowerAccountsUnlink.annotate(ResourceServer.OIDCScopes, WRITE_SCOPES))
    .add(TinyburgLinkedTinyTowerAccountsLink.annotate(ResourceServer.OIDCScopes, WRITE_SCOPES))
    .add(TinyburgLinkedTinyTowerAccountsVerify.annotate(ResourceServer.OIDCScopes, WRITE_SCOPES))
    // The group annotation is the floor for anything added later without its
    // own: unannotated means write, so a new endpoint cannot accidentally
    // default to the weaker permission.
    .annotate(ResourceServer.OIDCScopes, WRITE_SCOPES)
    .middleware(ResourceServer.Authorization);

const TinyTowerGroup = HttpApiGroup.make("TinyTowerGroup")
    .add(TinyTowerSyncPullSave.annotate(ResourceServer.OIDCScopes, READ_SCOPES))
    .add(TinyTowerSyncPushSave.annotate(ResourceServer.OIDCScopes, WRITE_SCOPES))
    .add(TinyTowerRaffleCheckEnteredCurrent.annotate(ResourceServer.OIDCScopes, READ_SCOPES))
    .add(TinyTowerRaffleEnter.annotate(ResourceServer.OIDCScopes, WRITE_SCOPES))
    .add(TinyTowerRaffleEnterMulti.annotate(ResourceServer.OIDCScopes, WRITE_SCOPES))
    .annotate(ResourceServer.OIDCScopes, WRITE_SCOPES)
    .middleware(ResourceServer.Authorization);

/** @since 1.0.0 */
export const Api = HttpApi.make("TradingSdk").add(LinkedTinyTowerAccountsGroup).add(TinyTowerGroup);
