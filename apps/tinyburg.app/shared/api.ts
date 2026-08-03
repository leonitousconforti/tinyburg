import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/unstable/httpapi";

/** The signed-in user, as served to the browser. */
export const CurrentUser = Schema.Struct({
    id: Schema.String.check(Schema.isUUID()),
    displayName: Schema.String,
    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Schema.DateTimeUtcFromString,
    lastLoginAt: Schema.DateTimeUtcFromString,
});
export type CurrentUser = typeof CurrentUser.Type;

/** A registered OAuth application, without its secret hash or owner. */
export const OAuthApp = Schema.Struct({
    id: Schema.String.check(Schema.isUUID()),
    name: Schema.String,
    redirectUris: Schema.Array(Schema.String),
    scope: Schema.String,
    createdAt: Schema.DateTimeUtcFromString,
});
export type OAuthApp = typeof OAuthApp.Type;

/** What a pending authorization request asks for, shown on the consent page. */
export const ConsentPrompt = Schema.Struct({
    clientName: Schema.String,
    scopes: Schema.Array(Schema.String),
    redirectUri: Schema.String,
});
export type ConsentPrompt = typeof ConsentPrompt.Type;

/** Where the browser goes after a consent decision: back to the client with
 *  a code on approval, or with access_denied. */
export const ConsentRedirect = Schema.Struct({
    redirectTo: Schema.String,
});
export type ConsentRedirect = typeof ConsentRedirect.Type;

export const GetMe = HttpApiEndpoint.get("me", "/api/me", {
    error: HttpApiError.Unauthorized,
    success: CurrentUser,
});

export const ListOAuthApps = HttpApiEndpoint.get("listApps", "/api/developers/apps", {
    error: HttpApiError.Unauthorized,
    success: Schema.Array(OAuthApp),
});

export const GetConsentPrompt = HttpApiEndpoint.get("prompt", "/api/oauth/requests/:requestId", {
    params: { requestId: Schema.String.check(Schema.isUUID()) },
    error: [HttpApiError.Unauthorized, HttpApiError.NotFound],
    success: ConsentPrompt,
});

export const DecideConsent = HttpApiEndpoint.post("decide", "/api/oauth/requests/:requestId/decision", {
    params: { requestId: Schema.String.check(Schema.isUUID()) },
    payload: Schema.Struct({ approve: Schema.Boolean }),
    error: [HttpApiError.Unauthorized, HttpApiError.NotFound],
    success: ConsentRedirect,
});

export const SessionGroup = HttpApiGroup.make("SessionGroup").add(GetMe);
export const DevelopersGroup = HttpApiGroup.make("DevelopersGroup").add(ListOAuthApps);
export const ConsentGroup = HttpApiGroup.make("ConsentGroup").add(GetConsentPrompt).add(DecideConsent);

export const TinyburgApi = HttpApi.make("TinyburgApi").add(SessionGroup).add(DevelopersGroup).add(ConsentGroup);
