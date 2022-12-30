import path from "path";
import Redis from "ioredis";
import { fastify } from "fastify";
import underPressure from "@fastify/under-pressure";
import fastifyFormbody from "@fastify/formbody";
import fastifyRateLimit from "@fastify/rate-limit";
import gracefulShutdown from "fastify-graceful-shutdown";
import { createConnection, getConnection } from "typeorm";

import api_v1 from "./routes/v1/api.js";
import version from "./routes/version.js";
import clientIp from "./plugins/clientIp.js";
import loggerOptions from "./loggerOptions.js";
import badRequest from "./plugins/badRequest.js";
import { buildRateLimitConfig } from "./auth/rateLimit.js";
import { buildUnderPressureConfig } from "./plugins/underPressure.js";

// Fastify app and redis
const app = fastify({ logger: loggerOptions, trustProxy: true, ignoreTrailingSlash: true });
const redis = new Redis(process.env["REDIS_URL"], { connectTimeout: 500, maxRetriesPerRequest: 1 });

// Fastify plugins
app.register(fastifyFormbody.default);
app.register(gracefulShutdown.default);
app.register(underPressure.default, buildUnderPressureConfig());
app.register(fastifyRateLimit.default, buildRateLimitConfig(redis));

// My plugins
app.register(clientIp, { header: "do-connecting-ip", addHook: true });
app.register(badRequest);

// API routes
app.register(version);
app.register(api_v1, { url: "/" });
app.register(api_v1, { url: "/v1" });

// Create the database connection and bind the app to the port,
// then register the graceful shutdown handler
(async function main() {
    await createConnection({
        type: "postgres",
        url: process.env.DATABASE_URL?.replace("?sslmode=require", ""),
        synchronize: true,
        logging: false,
        entities: [path.join(__dirname, "entity", "*.*")],
        ssl: {
            rejectUnauthorized: process.env.DATABASE_URL?.includes("?sslmode=require") ? false : true,
        },
    });

    await app.listen(process.env.PORT || 5000, "0.0.0.0");
    await app.after();

    app.gracefulShutdown(async (_code, next) => {
        await getConnection().close();
        next();
    });
})();
