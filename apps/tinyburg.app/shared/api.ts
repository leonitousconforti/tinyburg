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

export const GetMe = HttpApiEndpoint.get("me", "/api/me", {
    error: HttpApiError.Unauthorized,
    success: CurrentUser,
});

export const ListOAuthApps = HttpApiEndpoint.get("listApps", "/api/developers/apps", {
    error: HttpApiError.Unauthorized,
    success: Schema.Array(OAuthApp),
});

export const SessionGroup = HttpApiGroup.make("SessionGroup").add(GetMe);
export const DevelopersGroup = HttpApiGroup.make("DevelopersGroup").add(ListOAuthApps);

export const TinyburgApi = HttpApi.make("TinyburgApi").add(SessionGroup).add(DevelopersGroup);
