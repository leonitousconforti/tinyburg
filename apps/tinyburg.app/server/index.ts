import { Config, ConfigProvider, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";

import { StaticRoutesLive } from "./routes/static.ts";

HttpRouter.serve(StaticRoutesLive).pipe(
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3000)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    Layer.provideMerge(ConfigProvider.layerAdd(ConfigProvider.fromDotEnv())),
    Layer.provideMerge(NodeHttpServer.layerHttpServices),
    Layer.launch,
    NodeRuntime.runMain
);
