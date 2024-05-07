import { Redis } from "ioredis";
import { fastify } from "fastify";
import { DataSource } from "typeorm";
import closeWithGrace from "close-with-grace";
import { fastifyRateLimit } from "@fastify/rate-limit";
import { fastifyFormbody } from "@fastify/formbody";
import { fastifyUnderPressure } from "@fastify/under-pressure";

import api_v1 from "./routes/v1/api.js";
import ApiKey from "./entity/api-key.js";
import loggerOptions from "./logger-options.js";
import buildRateLimitConfig from "./auth/rate-limit.js";
import buildUnderPressureConfig from "./under-pressure.js";

// Fastify app and redis
const app = fastify({ logger: loggerOptions, trustProxy: true, ignoreTrailingSlash: true });
const redis = new Redis(process.env["REDIS_URL"]!, { connectTimeout: 500, maxRetriesPerRequest: 1 });

// Fastify plugins
await app.register(fastifyFormbody);
await app.register(fastifyRateLimit, buildRateLimitConfig(redis));
await app.register(fastifyUnderPressure, buildUnderPressureConfig());

// API routes
await app.register(api_v1, { url: "/" });
await app.register(api_v1, { url: "/v1" });

// Version route
app.get(
    "/version",
    () => `Running in NODE_ENV -> ${process.env["NODE_ENV"]}\nRunning from GIT_SHA -> ${process.env["GIT_SHA"]}`
);

// Create the database connection and bind the app to the port,
// then register the graceful shutdown handler
const postgres = await new DataSource({
    type: "postgres",
    logging: false,
    synchronize: true,
    url: process.env["DATABASE_URL"]!,
    entities: [ApiKey],
}).initialize();

// Start the fastify server
await app.listen({ port: Number.parseInt(process.env["PORT"] || "5000"), host: "0.0.0.0" });
await app.after();

// Close the postgres connection when the server shuts down
closeWithGrace({ delay: 2000 }, async ({ err }) => {
    if (err) console.error(err);
    await postgres.destroy();
});
