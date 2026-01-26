import type { APIContext, APIRoute } from "astro";

import {
    Cookies,
    HttpApi,
    HttpApiBuilder,
    HttpApiEndpoint,
    HttpApiError,
    HttpApiGroup,
    HttpLayerRouter,
    HttpServer,
    HttpServerResponse,
    UrlParams,
} from "@effect/platform";
import { Config, Context, Effect, Either, Layer, Option, pipe, Schema } from "effect";
import { Repository } from "../../domain/model";

const GoogleOAuthConfig = Config.all({
    clientId: Config.string("GOOGLE_CLIENT_ID"),
    clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
    redirectUri: Config.string("GOOGLE_REDIRECT_URI").pipe(
        Config.withDefault("http://localhost:4321/api/auth/google/callback")
    ),
});

class AstroLocals extends Context.Tag("AstroLocals")<AstroLocals, APIContext["locals"]>() {}

const OAuthGroup = HttpApiGroup.make("oauth")
    .add(HttpApiEndpoint.get("GoogleLogin", "/auth/google/login"))
    .add(
        HttpApiEndpoint.get("GoogleCallback", "/auth/google/callback").setUrlParams(
            Schema.Union(
                Schema.Struct({ error: Schema.String }),
                Schema.Struct({
                    code: Schema.String,
                    state: Schema.String,
                })
            )
        )
    );

const API = HttpApi.make("TinyburgApi")
    .add(OAuthGroup)
    .addError(HttpApiError.NotImplemented)
    .addError(HttpApiError.ServiceUnavailable)
    .addError(HttpApiError.InternalServerError);

const OauthGroupLive = HttpApiBuilder.group(API, "oauth", (handlers) =>
    handlers
        .handle("GoogleLogin", () =>
            Effect.gen(function* () {
                const state = "asdf"; // FIXME: implement a proper random string generator

                const config = yield* Effect.orDie(GoogleOAuthConfig);
                const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";

                const redirectUrl = pipe(
                    UrlParams.empty,
                    UrlParams.set("client_id", config.clientId),
                    UrlParams.set("redirect_uri", config.redirectUri),
                    UrlParams.set("response_type", "code"),
                    UrlParams.set("scope", "openid email profile"),
                    UrlParams.set("state", state),
                    UrlParams.set("access_type", "offline"),
                    UrlParams.set("prompt", "consent"),
                    (urlParams) => UrlParams.makeUrl(googleAuthUrl, urlParams, Option.none()),
                    Either.getOrUndefined
                );

                if (redirectUrl === undefined) {
                    return yield* new HttpApiError.InternalServerError();
                }

                const cookies = pipe(
                    Cookies.empty,
                    Cookies.set("google_oauth_state", state, {
                        maxAge: 60 * 10, // 10 minutes
                        httpOnly: true,
                        path: "/",
                        secure: true, // only add when deploying with https (prod)
                        sameSite: "lax", // optional - do not use "strict"
                    }),
                    Either.getOrUndefined
                );

                if (cookies === undefined) {
                    return yield* new HttpApiError.InternalServerError();
                }

                return HttpServerResponse.redirect(redirectUrl, { cookies });
            })
        )
        .handle("GoogleCallback", ({ request, urlParams }) =>
            Effect.gen(function* () {
                if ("error" in urlParams) {
                    return yield* new HttpApiError.InternalServerError();
                }

                const cookies = Cookies.fromSetCookie(Object.values(request.cookies));
                const stateCookie = Cookies.get(cookies, "google_oauth_state").pipe(Option.getOrUndefined);

                if (stateCookie === undefined || stateCookie.value !== urlParams.state) {
                    return yield* new HttpApiError.InternalServerError();
                }

                yield* Repository.upsertUserFromOAuth({
                    provider: "google",
                });

                return HttpServerResponse.empty();
            })
        )
);

const { dispose, handler } = HttpLayerRouter.addHttpApi(API).pipe(
    Layer.provide([OauthGroupLive, HttpServer.layerContext]),
    (layer) =>
        layer as Layer.Layer<
            Layer.Layer.Success<typeof layer>,
            Layer.Layer.Error<typeof layer>,
            | Exclude<Layer.Layer.Context<typeof layer>, AstroLocals>
            | HttpLayerRouter.Request.From<"Requires", AstroLocals>
        >,
    (layer) => HttpLayerRouter.toWebHandler(layer, { disableLogger: true })
);

// When the process is interrupted, we want to clean up resources
process.on("SIGTERM", () => {
    dispose().then(
        (_value) => {
            process.exit(0);
        },
        (_reason) => {
            process.exit(1);
        }
    );
});

// Astro API endpoint that allows ANY valid route into the Effect handler
export const ALL: APIRoute = async ({ locals, request }: APIContext) => {
    locals.foo = "bar"; // Example of setting a value in locals
    const localsContext = Context.make(AstroLocals, locals);
    return await handler(request, localsContext);
};
