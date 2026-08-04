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
 * @since 1.0.0
 */
export const TOWERS_SCOPE = "towers";

// Every endpoint is bearer authenticated: callers present an access token
// minted by the Tinyburg OIDC provider, whether that is the first-party app,
// a third-party application, or a long-lived api key.
const LinkedTinyTowerAccountsGroup = HttpApiGroup.make("LinkedTinyTowerAccountsGroup")
    .add(TinyburgLinkedTinyTowerAccountsList)
    .add(TinyburgLinkedTinyTowerAccountsUnlink)
    .add(TinyburgLinkedTinyTowerAccountsLink)
    .add(TinyburgLinkedTinyTowerAccountsVerify)
    .annotate(ResourceServer.OIDCScopes, [TOWERS_SCOPE])
    .middleware(ResourceServer.Authorization);

const TinyTowerGroup = HttpApiGroup.make("TinyTowerGroup")
    .add(TinyTowerSyncPullSave)
    .add(TinyTowerSyncPushSave)
    .add(TinyTowerRaffleCheckEnteredCurrent)
    .add(TinyTowerRaffleEnter)
    .add(TinyTowerRaffleEnterMulti)
    .annotate(ResourceServer.OIDCScopes, [TOWERS_SCOPE])
    .middleware(ResourceServer.Authorization);

/** @since 1.0.0 */
export const Api = HttpApi.make("TradingSdk").add(LinkedTinyTowerAccountsGroup).add(TinyTowerGroup);
