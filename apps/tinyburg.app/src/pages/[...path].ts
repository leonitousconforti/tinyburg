import type { APIContext, APIRoute } from "astro";

import {
    Cookies,
    FetchHttpClient,
    HttpApi,
    HttpApiBuilder,
    HttpApiEndpoint,
    HttpApiError,
    HttpApiGroup,
    HttpBody,
    HttpClient,
    HttpClientRequest,
    HttpLayerRouter,
    HttpServer,
    HttpServerResponse,
    UrlParams,
} from "@effect/platform";
import { Config, Context, Effect, Either, Encoding, Layer, Option, pipe, Schema } from "effect";

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
                const randomStateGenerator = () =>
                    Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
                        byte.toString(16).padStart(2, "0")
                    ).join("");

                const state = randomStateGenerator();
                const codeVerifier = randomStateGenerator();

                const config = yield* Effect.orDie(GoogleOAuthConfig);
                const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";

                const Sha256CodeChallenge = (verifier: string) =>
                    Effect.map(
                        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
                        (hashBuffer) => Encoding.encodeBase64Url(new Uint8Array(hashBuffer))
                    );

                const redirectUrl = pipe(
                    UrlParams.empty,
                    UrlParams.set("client_id", config.clientId),
                    UrlParams.set("redirect_uri", config.redirectUri),
                    UrlParams.set("response_type", "code"),
                    UrlParams.set("scope", "openid email profile"),
                    UrlParams.set("state", state),
                    UrlParams.set("code_challenge_method", "S256"),
                    UrlParams.set("code_challenge", yield* Sha256CodeChallenge(codeVerifier)),
                    UrlParams.set("access_type", "offline"),
                    UrlParams.set("prompt", "consent"),
                    (urlParams) => UrlParams.makeUrl(googleAuthUrl, urlParams, Option.none()),
                    Either.getOrUndefined
                );

                const stateCookie = Cookies.makeCookie("google_oauth_state", state, {
                    maxAge: 60 * 10, // 10 minutes
                    httpOnly: true,
                    path: "/",
                    secure: true, // only add when deploying with https (prod)
                    sameSite: "lax", // optional - do not use "strict"
                }).pipe(Either.getOrUndefined);

                const codeVerifierCookie = Cookies.makeCookie("google_oauth_verifier", codeVerifier, {
                    maxAge: 60 * 10, // 10 minutes
                    httpOnly: true,
                    path: "/",
                    secure: true, // only add when deploying with https (prod)
                    sameSite: "lax", // optional - do not use "strict"
                }).pipe(Either.getOrUndefined);

                if (redirectUrl === undefined || stateCookie === undefined || codeVerifierCookie === undefined) {
                    return yield* new HttpApiError.InternalServerError();
                }

                return HttpServerResponse.redirect(redirectUrl, {
                    cookies: Cookies.fromIterable([stateCookie, codeVerifierCookie]),
                });
            })
        )
        .handle("GoogleCallback", ({ request, urlParams }) =>
            Effect.gen(function* () {
                const config = yield* Effect.orDie(GoogleOAuthConfig);

                if ("error" in urlParams) {
                    return yield* new HttpApiError.InternalServerError();
                }

                const cookies = Cookies.fromSetCookie(Object.values(request.cookies));
                const stateCookie = Cookies.get(cookies, "google_oauth_state").pipe(Option.getOrUndefined);
                const codeVerifierCookie = Cookies.get(cookies, "google_oauth_verifier").pipe(Option.getOrUndefined);

                if (
                    stateCookie === undefined ||
                    codeVerifierCookie === undefined ||
                    stateCookie.value !== urlParams.state
                ) {
                    return yield* new HttpApiError.InternalServerError();
                }

                const tokens = yield* HttpClientRequest.post("https://oauth2.googleapis.com/token", {
                    headers: { "User-Agent": "TinyburgApp/1.0" },
                    body: pipe(
                        UrlParams.empty,
                        UrlParams.set("grant_type", "authorization_code"),
                        UrlParams.set("code", urlParams.code),
                        UrlParams.set("redirect_uri", config.redirectUri),
                        UrlParams.set("client_id", config.clientId),
                        UrlParams.set("code_verifier", codeVerifierCookie.value),
                        HttpBody.urlParams
                    ),
                }).pipe(
                    HttpClientRequest.acceptJson,
                    HttpClientRequest.basicAuth(config.clientId, config.clientSecret),
                    HttpClient.execute,
                    Effect.flatMap(({ json }) => json),
                    Effect.orDie
                );

                console.log(tokens);

                // const claims = decodeIdToken(tokens.idToken());
                // const claimsParser = new ObjectParser(claims);

                // const googleId = claimsParser.getString("sub");
                // const name = claimsParser.getString("name");
                // const picture = claimsParser.getString("picture");
                // const email = claimsParser.getString("email");

                // yield* Repository.upsertUserFromOAuth({
                //     provider: "google",
                // });

                return HttpServerResponse.empty();
            })
        )
);

const { dispose, handler } = HttpLayerRouter.addHttpApi(API).pipe(
    Layer.provide(OauthGroupLive),
    Layer.provide([HttpServer.layerContext, FetchHttpClient.layer]),
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
