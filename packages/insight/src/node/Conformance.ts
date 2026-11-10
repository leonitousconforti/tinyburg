/**
 * Checks an SDK's `HttpApi` against what a game was recorded doing (see
 * `NBSync.probe`): which of its endpoints the game called, whether the real
 * responses decode with the endpoint's success schemas, the exact preimage the
 * game signed for each request, and which URL paths the game has that the
 * SDK lacks.
 *
 * The report redacts the game's signing secrets and the player's auth key.
 *
 * @since 1.0.0
 */

import { Config, Data, Effect, Exit, Layer, Option, Predicate, Redacted, Schema } from "effect";

import * as crypto from "node:crypto";

import { GooglePlayApi } from "@efffrida/gplayapi";

import { layerDevice, layerPlay } from "./index.ts";
import * as Metadata from "./Metadata.ts";
import * as NBSync from "./NBSync.ts";

/**
 * One request the game made to Nimblebit.
 *
 * @since 1.0.0
 * @category Models
 */
export interface RequestCheck {
    /** "startup" for the game's own launch traffic, else the driven method. */
    readonly trigger: string;
    readonly method: string;
    readonly host: string;
    /** The path with the endpoint's params (and the player id) as `{tokens}`. */
    readonly path: string;
    /** The SDK endpoint whose path matched, as `Group.Endpoint`. */
    readonly endpoint: string | null;
    /** The string the game hashed for this request, tokenized, secrets as `{secret:N}`. */
    readonly preimage: string | null;
    readonly algorithm: "md5" | "sha256" | null;
    /** Whether the secret appended to the preimage is the game's `NBSync._ss`. */
    readonly secretIsSs: boolean | null;
    /** The response body, redacted and clipped. */
    readonly response: string | null;
    /** Whether the response decoded with the endpoint's success schemas. */
    readonly decoded: boolean | null;
    readonly decodeError: string | null;
}

/**
 * One endpoint of the SDK's `HttpApi`.
 *
 * @since 1.0.0
 * @category Models
 */
export interface EndpointCheck {
    readonly name: string;
    readonly method: string;
    readonly path: string;
    readonly observed: boolean;
    /** Whether every captured response decoded; null when none was captured. */
    readonly decoded: boolean | null;
    /** Whether the game has this path compiled in, when its literals were given. */
    readonly literal: boolean | null;
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Report {
    readonly bundleIdentifier: string;
    readonly requests: ReadonlyArray<RequestCheck>;
    readonly endpoints: ReadonlyArray<EndpointCheck>;
    /** Path segments compiled into the game that no SDK endpoint uses. */
    readonly literalsWithoutEndpoint: ReadonlyArray<string>;
    /** Whether the secret the SDK is configured with is the game's current `NBSync._ss`. */
    readonly configuredSecretMatches: boolean | null;
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Options {
    /** URL path segments compiled into the game, from `Metadata.urlPathsFromApks`. */
    readonly literals?: ReadonlyArray<string> | undefined;
    /** The secret the SDK signs with, to compare with the game's. */
    readonly configuredSecret?: Redacted.Redacted<string> | undefined;
}

/**
 * The parts of an `HttpApi` the check reads, so any SDK's `Api` fits.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ApiLike {
    readonly groups: Readonly<
        Record<
            string,
            {
                readonly endpoints: Readonly<
                    Record<
                        string,
                        { readonly method: string; readonly path: string; readonly success: ReadonlySet<Schema.Top> }
                    >
                >;
            }
        >
    >;
}

const isRecord = (u: unknown): u is Record<string, unknown> => Predicate.isObject(u) && !Array.isArray(u);
const field = (u: unknown, key: string): unknown => (isRecord(u) ? u[key] : undefined);
const text = (u: unknown): string | null => (typeof u === "string" ? u : null);

interface CapturedRequest {
    readonly url: string;
    readonly method: string;
    readonly trigger: string;
    response: string | null;
}

/** Pairs each request with its response: UnityWebRequest by download handler, WWW by object. */
const requestsOf = (run: NBSync.ProbeRun): ReadonlyArray<CapturedRequest> => {
    const enters = new Map<number, (typeof run.events)[number]>();
    const factories = new Map<string, string>();
    const byDownloadHandler = new Map<string, CapturedRequest>();
    const byWww = new Map<string, CapturedRequest>();
    const requests: Array<CapturedRequest> = [];
    let trigger = "startup";
    for (const event of run.events) {
        if (event.kind === "drive") trigger = event.key;
        if (event.kind === "enter") enters.set(event.id, event);
        if (event.kind !== "leave") continue;
        const enter = enters.get(event.id);
        if (event.tag === "web-factory") {
            const handle = text(field(event.ret, "handle"));
            if (handle !== null) factories.set(handle, event.key.replace(/^.*::(\w+)\(.*$/, "$1").toUpperCase());
        }
        if (event.tag === "web" && enter !== undefined) {
            const url = text(field(enter.self, "url"));
            if (url === null) continue;
            const method =
                text(field(enter.self, "method")) ?? factories.get(text(field(enter.self, "request")) ?? "") ?? "GET";
            const request: CapturedRequest = { url, method, trigger, response: null };
            requests.push(request);
            const handler = text(field(enter.self, "downloadHandler"));
            if (handler !== null) byDownloadHandler.set(handler, request);
        }
        if (event.tag === "www") {
            const url = text(field(event.self, "url"));
            const www = text(field(event.self, "www"));
            if (url === null || www === null) continue;
            const posts = isRecord(enter?.params) && Object.keys(enter.params).length > 1;
            const request: CapturedRequest = { url, method: posts ? "POST" : "GET", trigger, response: null };
            requests.push(request);
            byWww.set(www, request);
        }
        if (event.tag === "web-response" && enter !== undefined) {
            const request = byDownloadHandler.get(text(field(enter.self, "handle")) ?? "");
            if (request !== undefined && request.response === null) request.response = text(event.ret);
        }
        if (event.tag === "www-response" && enter !== undefined) {
            const request = byWww.get(text(field(enter.self, "www")) ?? "");
            if (request !== undefined && request.response === null) request.response = text(event.ret);
        }
    }
    // WWW runs on UnityWebRequest in newer Unity: keep one of each pair
    return requests.filter(
        (request, index) =>
            requests.findIndex((other) => other.url === request.url && other.trigger === request.trigger) === index
    );
};

/** Every hash the game computed, by its hex digest, with the hashed input. */
const hashesOf = (run: NBSync.ProbeRun): Map<string, string> => {
    const enters = new Map<number, (typeof run.events)[number]>();
    const hashes = new Map<string, string>();
    for (const event of run.events) {
        if (event.kind === "enter") enters.set(event.id, event);
        if (event.kind !== "leave" || event.tag !== "hash") continue;
        const digest = text(field(event.ret, "hex"));
        const params = enters.get(event.id)?.params;
        const input = isRecord(params)
            ? Object.values(params)
                  .map((p) => text(field(p, "text")))
                  .find((t) => t !== null)
            : undefined;
        if (digest !== null && input !== undefined && input !== null) hashes.set(digest.toLowerCase(), input);
    }
    return hashes;
};

/** Values that must not appear in a report: the game's secrets and the player's key. */
const secretsOf = (run: NBSync.ProbeRun): Map<string, string> => {
    const secrets = new Map<string, string>();
    const ss = text(field(run.statics["NBSync"], "_ss"));
    if (ss !== null) secrets.set(ss, "{NBSync._ss}");
    for (const event of run.events) {
        if (event.kind === "leave" && event.key.startsWith("NBSync::Q(")) {
            const secret = text(field(event.ret, "text"));
            if (secret !== null) secrets.set(secret, "{secret}");
        }
        if (event.key === "NBSync::set_playerSalt(System.String)") {
            const key = text(field(event.params, "value"));
            if (key !== null) secrets.set(key, "{playerAuthKey}");
        }
        const reply = text(event.ret);
        if (event.kind === "leave" && reply !== null && reply.includes("player_ss")) {
            try {
                const key = text(field(JSON.parse(reply), "player_ss"));
                if (key !== null) secrets.set(key, "{playerAuthKey}");
            } catch {
                // not JSON
            }
        }
    }
    return secrets;
};

interface Endpoint {
    readonly name: string;
    readonly method: string;
    readonly path: string;
    readonly pattern: RegExp;
    readonly keys: ReadonlyArray<string>;
    readonly success: ReadonlyArray<Schema.Top>;
}

const endpointsOf = (api: ApiLike): ReadonlyArray<Endpoint> => {
    const out: Array<Endpoint> = [];
    for (const [groupName, group] of Object.entries(api.groups)) {
        for (const [endpointName, endpoint] of Object.entries(group.endpoints)) {
            const keys: Array<string> = [];
            const source = endpoint.path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
                keys.push(key);
                return "([^/]+)";
            });
            out.push({
                name: `${groupName}.${endpointName}`,
                method: endpoint.method,
                path: endpoint.path,
                pattern: new RegExp(`^${source}$`),
                keys,
                success: [...endpoint.success],
            });
        }
    }
    return out;
};

const digest = (algorithm: "md5" | "sha256", input: string): string =>
    crypto.createHash(algorithm).update(input).digest("hex");

/**
 * Checks `api` against one probe run of its game.
 *
 * @since 1.0.0
 * @category Conformance
 */
export const check = (api: ApiLike, run: NBSync.ProbeRun, options?: Options): Report => {
    const endpoints = endpointsOf(api);
    const hashes = hashesOf(run);
    const secrets = secretsOf(run);
    const ss = text(field(run.statics["NBSync"], "_ss"));
    const redact = (s: string): string => {
        let out = s;
        for (const [secret, token] of secrets) if (secret.length >= 8) out = out.split(secret).join(token);
        return out;
    };

    const observed = new Map<string, { decoded: boolean | null }>();
    const requests = requestsOf(run)
        .filter((request) => request.url.includes("nimblebit.com"))
        .map((request): RequestCheck => {
            const url = new URL(request.url);
            const endpoint = endpoints.find((e) => e.pattern.test(url.pathname));
            const params: Record<string, string> = {};
            if (endpoint !== undefined) {
                const match = endpoint.pattern.exec(url.pathname);
                endpoint.keys.forEach((key, i) => (params[key] = decodeURIComponent(match?.[i + 1] ?? "")));
            }
            const tokenize = (s: string): string => {
                let out = redact(s);
                const values = Object.entries(params)
                    .filter(([key, value]) => key !== "hash" && value.length > 0)
                    .sort((a, b) => b[1].length - a[1].length);
                for (const [key, value] of values) out = out.split(value).join(`{${key}}`);
                if (run.playerId !== null) out = out.split(run.playerId).join("{playerId}");
                return out;
            };

            const hash = (params["hash"] ?? url.pathname.replace(/\/+$/, "").split("/").pop() ?? "").toLowerCase();
            const input = hashes.get(hash);
            const algorithm =
                input === undefined
                    ? null
                    : digest("md5", input) === hash
                      ? "md5"
                      : digest("sha256", input) === hash
                        ? "sha256"
                        : null;
            const secretIsSs = input === undefined || ss === null ? null : input.endsWith(ss);

            let decoded: boolean | null = null;
            let decodeError: string | null = null;
            const clipped = request.response !== null && /\.\.\.<\d+>$/.test(request.response);
            let json: unknown;
            try {
                json = request.response === null || clipped ? undefined : JSON.parse(request.response);
            } catch {
                json = undefined;
            }
            if (endpoint !== undefined && request.response !== null && json === undefined) {
                // Not the SDK's fault: the agent clipped it, or it is not JSON at all
                decodeError = clipped ? "response clipped by the agent" : "response is not JSON";
                observed.set(endpoint.name, { decoded: observed.get(endpoint.name)?.decoded ?? null });
            } else if (endpoint !== undefined && request.response !== null) {
                const errors: Array<string> = [];
                decoded = endpoint.success.some((schema) => {
                    // The SDKs' success schemas need no decoding services
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                    const exit = Schema.decodeUnknownExit(schema as Schema.Decoder<unknown>)(json);
                    if (Exit.isFailure(exit)) errors.push(String(exit.cause));
                    return Exit.isSuccess(exit);
                });
                if (!decoded) decodeError = redact(errors.join("\n")).slice(0, 1000);
                const previous = observed.get(endpoint.name)?.decoded ?? null;
                observed.set(endpoint.name, { decoded: (previous ?? true) && decoded });
            } else if (endpoint !== undefined) {
                observed.set(endpoint.name, { decoded: observed.get(endpoint.name)?.decoded ?? null });
            }

            return {
                trigger: request.trigger,
                method: request.method,
                host: url.host,
                path: tokenize(url.pathname),
                endpoint: endpoint?.name ?? null,
                preimage: input === undefined ? null : tokenize(input),
                algorithm,
                secretIsSs,
                response: request.response === null ? null : redact(request.response).slice(0, 400),
                decoded,
                decodeError,
            };
        });

    const literals = options?.literals;
    const segment = (path: string): string => path.split("/:")[0]?.replace(/\/[a-z]+$/, "") ?? path;
    const sdkSegments = new Set(endpoints.map((e) => `${segment(e.path)}/`));
    return {
        bundleIdentifier: run.bundleIdentifier,
        requests,
        endpoints: endpoints.map((e) => ({
            name: e.name,
            method: e.method,
            path: e.path,
            observed: observed.has(e.name),
            decoded: observed.get(e.name)?.decoded ?? null,
            literal: literals === undefined ? null : literals.includes(`${segment(e.path)}/`),
        })),
        literalsWithoutEndpoint: literals === undefined ? [] : literals.filter((literal) => !sdkSegments.has(literal)),
        configuredSecretMatches:
            options?.configuredSecret === undefined || ss === null
                ? null
                : Redacted.value(options.configuredSecret) === ss,
    };
};

/**
 * Whether the run contradicts the SDK: a Nimblebit request no endpoint
 * matches, or a response an endpoint's schemas cannot decode.
 *
 * @since 1.0.0
 * @category Conformance
 */
export const hasProblems = (report: Report): boolean =>
    report.requests.some((request) => request.endpoint === null || request.decoded === false);

/**
 * The report as Markdown.
 *
 * @since 1.0.0
 * @category Conformance
 */
export const render = (report: Report): string => {
    const lines: Array<string> = [`# ${report.bundleIdentifier}`, ""];
    if (report.configuredSecretMatches !== null) {
        lines.push(
            `Configured secret is the game's current NBSync._ss: ${report.configuredSecretMatches ? "yes" : "no"}`,
            ""
        );
    }
    lines.push(
        "## Requests",
        "",
        "| Trigger | Method | Path | SDK endpoint | Signed | Decoded |",
        "| --- | --- | --- | --- | --- | --- |"
    );
    for (const r of report.requests) {
        const signed = r.preimage === null ? "" : `${r.algorithm ?? "?"} \`${r.preimage}\``;
        const decoded = r.decoded === null ? "" : r.decoded ? "yes" : "**no**";
        lines.push(
            `| ${r.trigger.split("(")[0]} | ${r.method} | \`${r.path}\` | ${r.endpoint ?? "**none**"} | ${signed} | ${decoded} |`
        );
    }
    for (const r of report.requests.filter((r) => r.decodeError !== null)) {
        lines.push("", `${r.endpoint} did not decode \`${r.response ?? ""}\`:`, "", "```", r.decodeError ?? "", "```");
    }
    lines.push(
        "",
        "## SDK endpoints",
        "",
        "| Endpoint | Path | Observed | Decoded | In the game |",
        "| --- | --- | --- | --- | --- |"
    );
    for (const e of report.endpoints) {
        const literal = e.literal === null ? "" : e.literal ? "yes" : "no";
        lines.push(
            `| ${e.name} | \`${e.method} ${e.path}\` | ${e.observed ? "yes" : ""} | ${e.decoded === null ? (e.observed ? "no response" : "") : e.decoded ? "yes" : "**no**"} | ${literal} |`
        );
    }
    if (report.literalsWithoutEndpoint.length > 0) {
        lines.push(
            "",
            "## URL-like literals in the game with no SDK endpoint",
            "",
            "Candidates: this list can include asset folders as well as NBSync paths.",
            "",
            report.literalsWithoutEndpoint.map((l) => `\`${l}\``).join(", ")
        );
    }
    return lines.join("\n") + "\n";
};

/**
 * Probes a game on the emulator (see `NBSync.probe`), reads the URL paths
 * compiled into it from its APK, and checks `api` against both.
 *
 * @since 1.0.0
 * @category Conformance
 */
export const run = Effect.fnUntraced(function* (
    api: ApiLike,
    bundleIdentifier: string,
    options?: Omit<Options, "literals"> & NBSync.ProbeOptions
) {
    // One download serves both the literals and the install
    const files = (yield* GooglePlayApi.downloadToDisk(bundleIdentifier)).map((apk) => apk.file);
    const literals = yield* Metadata.urlPathsFromApks(files);
    // Each run boots its own emulator and session, so this is its entry point
    const session = Layer.provide(NBSync.layerAgent(bundleIdentifier), layerDevice(bundleIdentifier, { apks: files }));
    // oxlint-disable-next-line effecttsgo/strict-effect-provide
    const probeRun = yield* NBSync.probe(bundleIdentifier, options).pipe(Effect.scoped, Effect.provide(session));
    return check(api, probeRun, { literals, configuredSecret: options?.configuredSecret });
}, Effect.scoped);

/**
 * The game made a request the SDK has no endpoint for, or got a response the
 * SDK's schemas cannot decode.
 *
 * @since 1.0.0
 * @category Errors
 */
export class ConformanceError extends Data.TaggedError("ConformanceError")<{ readonly bundleIdentifier: string }> {
    override get message() {
        return `${this.bundleIdentifier} made requests the SDK does not model or cannot decode`;
    }
}

/**
 * An SDK's `pnpm conformance`: runs `run`, prints the report as Markdown and
 * fails if the game did something the SDK does not model. The secret the SDK
 * signs with for this game is read from `secretVariable`, if set, and only
 * compared with the game's.
 *
 * @since 1.0.0
 * @category Conformance
 */
export const main = Effect.fnUntraced(function* (api: ApiLike, bundleIdentifier: string, secretVariable: string) {
    const configuredSecret = yield* Config.option(Config.Redacted(secretVariable));
    const report = yield* run(api, bundleIdentifier, {
        configuredSecret: Option.getOrUndefined(configuredSecret),
    }).pipe(
        // An SDK's conformance script is the entry point
        // oxlint-disable-next-line effecttsgo/strict-effect-provide
        Effect.provide(layerPlay)
    );
    yield* Effect.sync(() => process.stdout.write(render(report)));
    if (hasProblems(report)) {
        return yield* new ConformanceError({ bundleIdentifier });
    }
});
