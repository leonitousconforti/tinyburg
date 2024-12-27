import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";
import { loadApk } from "./index.js";

await Effect.runPromise(Effect.provide(loadApk("com.nimblebit.tinytower"), NodeFileSystem.layer));
