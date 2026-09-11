/**
 * The reverse proxy in front of the treasury.
 *
 * The `/trades` page lives in this app's SPA, but the treasury is its own
 * service on its own origin, and the SPA deliberately holds no token - the
 * cookie is the whole of its authentication. So treasury requests arrive
 * here same-origin, the session is traded for the same short-lived bearer
 * the trading api uses, and the request is forwarded verbatim. The treasury
 * verifies the token against this server's published keys; no CORS, no
 * second cookie, and a third-party caller with a token of its own can skip
 * this entirely by calling the treasury's host directly.
 */

import { Config, Effect, Layer, Option } from "effect";
import {
    Headers,
    HttpClient,
    HttpClientRequest,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
} from "effect/unstable/http";

import { maybeCurrentUser } from "../cookies.ts";
import { accessTokenFor } from "./api.ts";

const treasuryUrl = Config.string("TREASURY_URL").pipe(
    Config.withDefault("http://localhost:3004"),
    Config.map((url) => url.replace(/\/$/, ""))
);

const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "host", "content-length"]);

const proxy = (target: string) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const httpClient = yield* HttpClient.HttpClient;

        // A caller presenting its own token keeps it; a browser session is
        // traded for a first-party bearer, exactly as the trading api does.
        const authorization = Headers.has(request.headers, "authorization")
            ? Option.fromNullishOr(request.headers["authorization"])
            : yield* Effect.flatMap(maybeCurrentUser, (currentUser) =>
                  Option.isNone(currentUser)
                      ? Effect.succeedNone
                      : accessTokenFor(currentUser.value).pipe(
                            Effect.map((token) => Option.some(`Bearer ${token}`)),
                            Effect.option,
                            Effect.map(Option.flatten)
                        )
              ).pipe(Effect.catch(() => Effect.succeedNone));

        const forwardedHeaders = Object.fromEntries(
            Object.entries(request.headers).filter(([name]) => !HOP_BY_HOP.has(name) && name !== "cookie")
        );

        const body = request.method === "GET" || request.method === "HEAD" ? "" : yield* request.text;

        const upstream = HttpClientRequest.make(request.method)(`${target}${request.url}`).pipe(
            HttpClientRequest.setHeaders(forwardedHeaders),
            Option.isSome(authorization)
                ? HttpClientRequest.setHeader("authorization", authorization.value)
                : (clientRequest) => clientRequest,
            body === ""
                ? (clientRequest) => clientRequest
                : HttpClientRequest.bodyText(body, request.headers["content-type"] ?? "application/json")
        );

        const response = yield* httpClient.execute(upstream);
        const text = yield* response.text;

        return HttpServerResponse.text(text, {
            status: response.status,
            contentType: response.headers["content-type"] ?? "application/json",
        });
    }).pipe(Effect.catch(() => Effect.succeed(HttpServerResponse.empty({ status: 503 }))));

export const TreasuryProxyLive = Layer.unwrap(
    Effect.map(treasuryUrl, (target) => HttpRouter.add("*", "/v1/treasury/*", proxy(target)))
);
