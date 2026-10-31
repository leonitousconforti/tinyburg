/**
 * The reverse proxy in front of the treasury.
 *
 * The treasury is the api's `/v1/treasury/*`, served by a service of its own,
 * so every caller reaches it here, at the one resource every Tinyburg access
 * token is issued for (`apiResourceFor`). Requests are forwarded verbatim,
 * `Authorization` included, and the treasury verifies the JWT itself against
 * this server's JWKS. Nothing is added: a caller without a token reaches the
 * treasury without one, and its challenge comes back unchanged. The SPA gets
 * its token from `/auth/token` (`./token.ts`) like any other request it makes.
 *
 * What does not cross is what belongs to the connection rather than the
 * request (RFC 9110 Section 7.6.1), and cookies, both ways: the visitor's
 * session is this server's and no other service's, and a cookie the
 * treasury set would land on this site's origin.
 */

import { Config, Duration, Effect, Layer } from "effect";
import {
    FetchHttpClient,
    type Headers,
    HttpClient,
    HttpClientRequest,
    HttpMethod,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
} from "effect/http";

const treasuryUrl = Config.String("TREASURY_URL").pipe(
    Config.withDefault("http://localhost:3004"),
    Config.map((url) => url.replace(/\/$/, ""))
);

/** How long the treasury may take to answer before the caller is told it did not. */
const UPSTREAM_TIMEOUT = Duration.seconds(30);

/** Headers that describe one connection, not the request or response it carries (RFC 9110 Section 7.6.1). */
const HOP_BY_HOP: ReadonlySet<string> = new Set([
    "connection",
    "keep-alive",
    "proxy-connection",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
]);

/**
 * What else stays behind. Each way, the cookies. Going out, the host, length
 * and accepted encodings, which the client sets for the next hop itself.
 * Coming back, the length and encoding, which describe the body as it was on
 * the wire, before fetch decoded it.
 */
const NOT_FORWARDED: ReadonlySet<string> = new Set(["cookie", "host", "content-length", "accept-encoding"]);
const NOT_RETURNED: ReadonlySet<string> = new Set(["set-cookie", "content-length", "content-encoding"]);

/** `headers` minus the hop-by-hop ones, those the `Connection` header names, and `dropped`. */
const forwardable = (headers: Headers.Headers, dropped: ReadonlySet<string>): Record<string, string> => {
    const named = new Set(
        (headers["connection"] ?? "")
            .split(",")
            .map((name) => name.trim().toLowerCase())
            .filter((name) => name.length > 0)
    );
    return Object.fromEntries(
        Object.entries(headers).filter(([name]) => !HOP_BY_HOP.has(name) && !named.has(name) && !dropped.has(name))
    );
};

const proxy = (target: string) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const httpClient = yield* HttpClient.HttpClient;

        // Node accepts methods fetch cannot send; the treasury serves none of them.
        if (!HttpMethod.isHttpMethod(request.method)) return HttpServerResponse.empty({ status: 405 });

        const bodyless = request.method === "GET" || request.method === "HEAD";
        const body = bodyless ? undefined : new Uint8Array(yield* request.arrayBuffer);

        const upstream = HttpClientRequest.make(request.method)(`${target}${request.url}`).pipe(
            HttpClientRequest.setHeaders(forwardable(request.headers, NOT_FORWARDED)),
            (outgoing) =>
                body === undefined
                    ? outgoing
                    : HttpClientRequest.bodyUint8Array(outgoing, body, request.headers["content-type"])
        );

        // A redirect is the treasury's answer to the caller, not the proxy's
        // to follow.
        const { response, answer } = yield* Effect.gen(function* () {
            const response = yield* httpClient.execute(upstream);
            return { response, answer: new Uint8Array(yield* response.arrayBuffer) };
        }).pipe(
            Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
            Effect.timeout(UPSTREAM_TIMEOUT)
        );
        const headers = forwardable(response.headers, NOT_RETURNED);

        return answer.length === 0
            ? HttpServerResponse.empty({ status: response.status, headers })
            : HttpServerResponse.uint8Array(answer, { status: response.status, headers });
    }).pipe(
        Effect.catch((error) =>
            Effect.as(
                Effect.logWarning("the treasury could not be reached", error),
                HttpServerResponse.empty({ status: error._tag === "TimeoutError" ? 504 : 502 })
            )
        )
    );

/** `/v1/treasury/*`, every method, forwarded to `TREASURY_URL` (the dev stack's treasury by default). */
export const TreasuryProxyLive = Layer.unwrap(
    Effect.map(treasuryUrl, (target) => HttpRouter.add("*", "/v1/treasury/*", proxy(target)))
);
