import { Redis } from "ioredis";
import { fastify } from "fastify";
import { DataSource } from "typeorm";
import closeWithGrace from "close-with-grace";
import fastifyRateLimit from "@fastify/rate-limit";
import { fastifyFormbody } from "@fastify/formbody";
import { fastifyUnderPressure } from "@fastify/under-pressure";

import api_v1 from "./routes/v1/api.js";
import version from "./routes/version.js";
import { ApiKey } from "./entity/api-key.js";
import loggerOptions from "./logger-options.js";
import badRequest from "./plugins/bad-request.js";
import { buildRateLimitConfig } from "./auth/rate-limit.js";
import { buildUnderPressureConfig } from "./plugins/under-pressure.js";

// Fastify app and redis
const app = fastify({ logger: loggerOptions, trustProxy: true, ignoreTrailingSlash: true });
const redis = new Redis(process.env["REDIS_URL"]!, { connectTimeout: 500, maxRetriesPerRequest: 1 });

// Fastify plugins
await app.register(fastifyFormbody);
await app.register(fastifyUnderPressure, buildUnderPressureConfig());
await app.register(fastifyRateLimit.default, buildRateLimitConfig(redis));

// My plugins
await app.register(badRequest);

// API routes
await app.register(version);
await app.register(api_v1, { url: "/" });
await app.register(api_v1, { url: "/v1" });

// Create the database connection and bind the app to the port,
// then register the graceful shutdown handler
const postgres = await new DataSource({
    type: "postgres",
    logging: false,
    synchronize: true,
    url: process.env["DATABASE_URL"]!,
    entities: [ApiKey],
}).initialize();

await app.listen({ port: Number.parseInt(process.env["PORT"] || "5000", 10), host: "0.0.0.0" });
await app.after();

closeWithGrace({ delay: 500 }, async ({ err }) => {
    if (err) {
        console.error(err);
    }
    await postgres.destroy();
});
