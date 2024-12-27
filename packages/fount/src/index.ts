import * as path from "node:path";

import * as Command from "@effect/platform/Command";
import * as CommandExecutor from "@effect/platform/CommandExecutor";
import * as PlatformError from "@effect/platform/Error";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as FileSystem from "@effect/platform/FileSystem";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as ReadonlyArray from "effect/Array";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as HashMap from "effect/HashMap";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { ApksupportScrapingError, getApksupportDetails } from "./puppeteer.js";
import {
    Game,
    RelativeVersion,
    SemanticVersion,
    type AnyGame,
    type SemanticVersionAndAppVersionCode,
} from "./schemas.js";
import {
    getSemanticVersionsByRelativeVersions,
    trackedVersions,
    type AllTrackedVersions,
    type TrackedVersion,
} from "./versions.js";

export const loadApk = <T extends AnyGame>(
    game: T,
    version:
        | typeof SemanticVersion.Type
        | typeof RelativeVersion.Type
        | Extract<TrackedVersion<T>, AllTrackedVersions> = "latest version"
): Effect.Effect<
    string,
    | ParseResult.ParseError
    | PlatformError.BadArgument
    | PlatformError.SystemError
    | HttpClientError.HttpClientError
    | ApksupportScrapingError,
    FileSystem.FileSystem
> =>
    Effect.gen(function* () {
        const fs: FileSystem.FileSystem = yield* FileSystem.FileSystem;

        // Convert from whatever version was given to a semantic version
        const svbrv = yield* getSemanticVersionsByRelativeVersions(game);
        const versionInfo = Function.pipe(
            Match.value<typeof SemanticVersion.Type | typeof RelativeVersion.Type | AllTrackedVersions>(version),
            Match.when(
                (v): v is AllTrackedVersions => Object.keys(trackedVersions[game]).includes(v),
                (v) => trackedVersions[game][v as TrackedVersion<T>] as typeof SemanticVersionAndAppVersionCode.Type
            ),
            Match.when(Schema.is(SemanticVersion), (v) =>
                svbrv.pipe(
                    HashMap.filter(({ semanticVersion }) => semanticVersion === v),
                    HashMap.values,
                    ReadonlyArray.fromIterable,
                    ReadonlyArray.head,
                    Option.getOrThrow
                )
            ),
            Match.when(Schema.is(RelativeVersion), (v) => svbrv.pipe(HashMap.get(v), Option.getOrThrow)),
            Match.exhaustive
        );

        yield* Effect.logInfo(`App version code for ${version} is ${versionInfo.appVersionCode}`);
        yield* Effect.logInfo(`Semantic version for ${version} is ${versionInfo.semanticVersion}`);

        // Start the download
        const results = yield* getApksupportDetails(game, versionInfo);
        yield* Effect.logInfo(`Puppeteer scraping results: ${results[0]}`);
        if (!results[0].startsWith("https://play.googleapis.com/download/")) {
            return yield* new ApksupportScrapingError({ message: `${results[0]} is not a googleapis download url` });
        }

        // Stream the download directly to the downloads folder
        const downloadedFile = `${game}_${versionInfo.semanticVersion}.apk`;
        const response = yield* HttpClient.get(results[0]).pipe(Effect.provide(FetchHttpClient.layer));
        yield* Stream.run(response.stream, fs.sink(downloadedFile));
        yield* Effect.logInfo(`Successfully downloaded ${game} ${version} to ${downloadedFile}`);
        return "";
    }).pipe(Effect.scoped);

export const patchApk = <T extends AnyGame>(
    game: T,
    version:
        | typeof SemanticVersion.Type
        | typeof RelativeVersion.Type
        | Extract<TrackedVersion<T>, AllTrackedVersions> = "latest version"
): Effect.Effect<
    string,
    | ParseResult.ParseError
    | PlatformError.BadArgument
    | PlatformError.SystemError
    | HttpClientError.HttpClientError
    | ApksupportScrapingError,
    FileSystem.FileSystem | CommandExecutor.CommandExecutor
> =>
    Effect.gen(function* () {
        const commandExecutor: CommandExecutor.CommandExecutor = yield* CommandExecutor.CommandExecutor;

        const apkPath = yield* loadApk(game, version);
        const parsedPath = path.parse(apkPath);
        const patchedApkFilename = path.join(parsedPath.dir, `${parsedPath.name}-patched${parsedPath.ext}`);

        const command: Command.Command = Command.make("apk-mitm", apkPath);
        const exitCode: CommandExecutor.ExitCode = yield* commandExecutor.exitCode(command);
        if (exitCode !== 0) {
            yield* Effect.fail(
                PlatformError.SystemError({
                    method: "",
                    reason: "Unknown",
                    module: "Command",
                    pathOrDescriptor: "apk-mitm",
                    message: `Failed to patch apk: ${apkPath}`,
                })
            );
        }

        return patchedApkFilename;
    });

export { Game } from "./schemas.js";
export default { loadApk, patchApk, Game };
