// import { NodeContext, NodeRuntime } from "@effect/platform-node";
// import { PgClient, PgMigrator } from "@effect/sql-pg";
// import { Effect, Layer, pipe } from "effect";
// import { fileURLToPath } from "node:url";

// const program = Effect.gen(function* () {
//     // ...
// });

// const SqlLive = PgClient.layer({
//     database: "example_database",
// });

// const MigratorLive = PgMigrator.layer({
//     loader: PgMigrator.fromFileSystem(fileURLToPath(new URL("migrations", import.meta.url))),
//     schemaDirectory: "migrations",
// }).pipe(Layer.provide(SqlLive));

// const EnvLive = Layer.mergeAll(SqlLive, MigratorLive).pipe(Layer.provide(NodeContext.layer));

// pipe(program, Effect.provide(EnvLive), NodeRuntime.runMain);
