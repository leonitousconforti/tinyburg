import * as S3Client from "@aws-sdk/client-s3";
import * as S3ClientEffect from "@effect-aws/client-s3";
import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as PlatformError from "@effect/platform/Error";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import * as Schema from "@effect/schema/Schema";
import * as Fount from "@tinyburg/fount";
import * as FountVersions from "@tinyburg/fount/versions";
import * as Config from "effect/Config";
import * as ConfigError from "effect/ConfigError";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";
import * as fs from "node:fs";

const AWS_BUCKET: Config.Config<string> = Config.string("AWS_BUCKET");
const AWS_REGION: Config.Config<string> = Config.string("AWS_REGION");
const AWS_ENDPOINT: Config.Config<string> = Config.string("AWS_ENDPOINT");
const AWS_ACCESS_KEY_ID: Config.Config<string> = Config.string("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY: Config.Config<string> = Config.string("AWS_SECRET_ACCESS_KEY");

const S3ClientInstanceLayer: Layer.Layer<S3ClientEffect.S3ClientInstance, ConfigError.ConfigError, never> =
    Layer.effect(
        S3ClientEffect.S3ClientInstance,
        Effect.gen(function* () {
            const region = yield* AWS_REGION;
            const endpoint = yield* AWS_ENDPOINT;
            const accessKeyId = yield* AWS_ACCESS_KEY_ID;
            const secretAccessKey = yield* AWS_SECRET_ACCESS_KEY;

            // https://docs.digitalocean.com/reference/api/spaces-api/
            return new S3Client.S3Client({
                region,
                endpoint,
                forcePathStyle: false,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });
        })
    );

// eslint-disable-next-line @typescript-eslint/naming-convention
interface $ApkArchiveName
    extends Schema.Annotable<
        $ApkArchiveName,
        `${Fount.Games}_${number}.${number}.${number}.apk`,
        `${Fount.Games}_${number}.${number}.${number}.apk`,
        never
    > {}

const apkArchiveName: $ApkArchiveName = Schema.TemplateLiteral(
    Schema.Union(
        Schema.Literal(Fount.Games.BitCity),
        Schema.Literal(Fount.Games.LegoTower),
        Schema.Literal(Fount.Games.PocketFrogs),
        Schema.Literal(Fount.Games.PocketPlanes),
        Schema.Literal(Fount.Games.PocketTrains),
        Schema.Literal(Fount.Games.TinyTower)
    ),
    Schema.Literal("_"),
    Schema.Number,
    Schema.Literal("."),
    Schema.Number,
    Schema.Literal("."),
    Schema.Number,
    Schema.Literal(".apk")
);

const setupLocalCache = (
    temporaryDirectory: string
): Effect.Effect<
    void,
    ConfigError.ConfigError | S3ClientEffect.SdkError | S3ClientEffect.NoSuchBucketError | PlatformError.PlatformError,
    Path.Path | FileSystem.FileSystem | S3ClientEffect.S3Service
> =>
    Effect.gen(function* () {
        const bucket: string = yield* AWS_BUCKET;
        const path: Path.Path = yield* Path.Path;
        const filesystem: FileSystem.FileSystem = yield* FileSystem.FileSystem;
        const s3Client: S3ClientEffect.S3Service = yield* S3ClientEffect.S3Service;

        const objects = yield* s3Client.listObjects({ Bucket: bucket, Prefix: "apks/" });
        for (const object of objects.Contents ?? []) {
            const key = object.Key?.replaceAll("apks/", "");
            if (!key || key === "" || Schema.decodeUnknownOption(apkArchiveName)(key).pipe(Option.isNone)) continue;
            yield* Effect.logInfo(`Caching ${key} in ${temporaryDirectory}`);

            const localPath = path.join(temporaryDirectory, key);
            const exists = yield* filesystem.exists(localPath);
            if (!exists) yield* filesystem.writeFileString(localPath, ".");
        }
    });

const downloadUploadApk = (
    game: Fount.Games,
    version: "latest version" | `${number} versions before latest`,
    temporaryDirectory: string
): Effect.Effect<void, never, S3ClientEffect.S3Service | FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* () {
        const bucket: string = yield* AWS_BUCKET;
        const path: Path.Path = yield* Path.Path;
        const filesystem: FileSystem.FileSystem = yield* FileSystem.FileSystem;
        const s3Client: S3ClientEffect.S3Service = yield* S3ClientEffect.S3Service;

        return Effect.acquireUseRelease(
            Fount.loadApk(game, version, temporaryDirectory),
            (localPath) =>
                s3Client
                    .putObject({
                        Bucket: bucket,
                        Body: fs.createReadStream(localPath),
                        Key: `apks/${path.basename(localPath)}`,
                    })
                    .pipe(Effect.andThen(filesystem.writeFileString(localPath, "."))),
            (localPath) => filesystem.remove(localPath, { force: true }).pipe(Effect.orDie)
        );
    })
        .pipe(Effect.flatten)
        .pipe(Effect.scoped)
        .pipe(Effect.catchAll(Effect.logError));

const downloadAll = (
    game: Fount.Games,
    temporaryDirectory: string
): Effect.Effect<void, never, Path.Path | S3ClientEffect.S3Service | FileSystem.FileSystem> =>
    Effect.gen(function* () {
        const versions = yield* FountVersions.getSemanticVersionsByRelativeVersions(game);
        for (const relativeIndexVersion of versions.pipe(HashMap.keySet)) {
            yield* downloadUploadApk(Fount.Games.BitCity, relativeIndexVersion, temporaryDirectory);
            yield* Effect.sleep("3 seconds");
        }
    }).pipe(Effect.catchAll(Effect.logError));

Effect.gen(function* () {
    const filesystem: FileSystem.FileSystem = yield* FileSystem.FileSystem;
    const temporaryDirectory = yield* filesystem.makeTempDirectoryScoped();
    yield* setupLocalCache(temporaryDirectory);
    yield* Effect.logInfo(`Using ${temporaryDirectory} as @tinyburg/fount cache directory`);

    yield* downloadAll(Fount.Games.BitCity, temporaryDirectory);
    yield* downloadAll(Fount.Games.LegoTower, temporaryDirectory);
    yield* downloadAll(Fount.Games.PocketFrogs, temporaryDirectory);
    yield* downloadAll(Fount.Games.PocketPlanes, temporaryDirectory);
    yield* downloadAll(Fount.Games.PocketTrains, temporaryDirectory);
    yield* downloadAll(Fount.Games.TinyTower, temporaryDirectory);
})
    .pipe(Effect.scoped)
    .pipe(Effect.repeat(Schedule.spaced("1 day")))
    .pipe(Effect.provide(S3ClientEffect.BaseS3ServiceLayer))
    .pipe(Effect.provide(S3ClientInstanceLayer))
    .pipe(Effect.provide(NodeContext.layer))
    .pipe(NodeRuntime.runMain);
