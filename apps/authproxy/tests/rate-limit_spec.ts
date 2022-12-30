import "../routes/types/Request";

import { test } from "tap";
import Redis from "ioredis";
import * as path from "path";
import { fastify } from "fastify";
import { ApiKey } from "../entity/ApiKey";
import { createConnection } from "typeorm";
import fastifyRateLimit from "fastify-rate-limit";
import { buildRateLimitConfig } from "./../auth/rateLimit";
import clientIp from "../plugins/clientIp";

const RateLimitHitResponse = {
    statusCode: 429,
    error: "Too Many Requests",
    message: "You hit the rate limit, Slow down please! You can retry in 2 minutes",
};

const BannedResponse = (ip: string) => ({
    statusCode: 403,
    error: "Forbidden",
    message: `You can not access this service as you have sent too many requests that exceed your rate limit. Your IP: ${ip}`,
});

// Rate limiting off of IP
test("Basic", async (t) => {
    t.plan(49);

    // Create the fastify app
    const app = fastify();

    // Create the redis and typeorm connections
    const redis = new Redis("redis://localhost:6379");
    const postgresConn = await createConnection({
        type: "postgres",
        url: "postgresql://postgres:password@localhost:5432/authproxy",
        database: "authproxy",
        synchronize: true,
        dropSchema: true,
        logging: false,
        entities: [path.join(__dirname, "..", "entity", "*.*")],
    });

    // Setup rate limiting and flush the redis cache
    app.register(clientIp, { header: "cf-connecting-ip", addHook: true });
    app.register(fastifyRateLimit, buildRateLimitConfig(redis));
    await redis.flushdb();

    // Simple handler
    app.get("/", (_req, reply) => {
        reply.send("hello!");
    });

    // 5 regular requests
    for (let i = 5; i > 0; i--) {
        const res = await app.inject("/");
        t.equal(res.statusCode, 200);
        t.equal(res.headers["x-ratelimit-limit"], 5);
        t.equal(res.headers["x-ratelimit-remaining"], i - 1);
    }

    // Followed by 3 requests that hit the rate limit
    for (let i = 3; i > 0; i--) {
        const res2 = await app.inject("/");
        t.equal(res2.statusCode, 429);
        t.equal(res2.headers["content-type"], "application/json; charset=utf-8");
        t.equal(res2.headers["x-ratelimit-limit"], 5);
        t.equal(res2.headers["x-ratelimit-remaining"], 0);
        t.equal(res2.headers["retry-after"], 120000);
        t.same(RateLimitHitResponse, JSON.parse(res2.payload));
    }

    // Followed by 2 banned requests
    for (let i = 2; i > 0; i--) {
        const res3 = await app.inject("/");
        t.equal(res3.statusCode, 403);
        t.equal(res3.headers["content-type"], "application/json; charset=utf-8");
        t.equal(res3.headers["x-ratelimit-limit"], 5);
        t.equal(res3.headers["x-ratelimit-remaining"], 0);
        t.equal(res3.headers["retry-after"], 120000);
        t.same(BannedResponse("127.0.0.1"), JSON.parse(res3.payload));
    }

    // Wait two minutes and try again, should be a successful request
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 122000);
    const res4 = await app.inject("/");
    t.equal(res4.statusCode, 200);
    t.equal(res4.headers["x-ratelimit-limit"], 5);
    t.equal(res4.headers["x-ratelimit-remaining"], 4);
    t.equal(res4.payload, "hello!");

    // Quit and teardown
    await redis.quit();
    await postgresConn.close();
    t.end();
});

// Rate limiting with api key
test("With API key", async (t) => {
    t.plan(96);

    // Create the fastify app
    const app = fastify();

    // Create the redis and typeorm connections
    const redis = new Redis("redis://localhost:6379");
    const postgresConn = await createConnection({
        type: "postgres",
        url: "postgresql://postgres:password@localhost:5432/authproxy",
        database: "authproxy",
        synchronize: true,
        dropSchema: true,
        logging: false,
        entities: [path.join(__dirname, "..", "entity", "*.*")],
    });

    // Create an apiKey
    const apiKey = await ApiKey.create({ rateLimitPerWindow: 20 }).save();

    // Setup rate limiting and flush the redis cache
    app.register(clientIp, { header: "cf-connecting-ip", addHook: true });
    app.register(fastifyRateLimit, buildRateLimitConfig(redis));
    await redis.flushdb();

    // Simple handler
    app.get(
        "/",
        {
            onRequest: async function (request) {
                const key = request.headers.authorization?.replace("Bearer: ", "").trim();
                const apiKeyObject = await ApiKey.findOne({ where: { apiKey: key } });
                request.apiKey = apiKeyObject;
            },
        },
        (_req, reply) => {
            reply.send("hello!");
        }
    );

    // 20 regular requests
    t.notOk(apiKey.lastUsed);
    for (let i = 20; i > 0; i--) {
        const res = await app.inject({ url: "/", headers: { authorization: `Bearer: ${apiKey.apiKey}` } });
        t.equal(res.statusCode, 200);
        t.equal(res.headers["x-ratelimit-limit"], 20);
        t.equal(res.headers["x-ratelimit-remaining"], i - 1);
    }
    const apiKey2 = await ApiKey.findOneOrFail({ where: { id: apiKey.id } });
    t.not(apiKey2.lastUsed, null);

    // Followed by 3 requests that hit the rate limit
    for (let i = 3; i > 0; i--) {
        const res2 = await app.inject({ url: "/", headers: { authorization: `Bearer: ${apiKey.apiKey}` } });
        t.equal(res2.statusCode, 429);
        t.equal(res2.headers["content-type"], "application/json; charset=utf-8");
        t.equal(res2.headers["x-ratelimit-limit"], 20);
        t.equal(res2.headers["x-ratelimit-remaining"], 0);
        t.equal(res2.headers["retry-after"], 120000);
        t.same(RateLimitHitResponse, JSON.parse(res2.payload));
    }

    // Followed by 2 banned requests
    for (let i = 2; i > 0; i--) {
        const res3 = await app.inject({ url: "/", headers: { authorization: `Bearer: ${apiKey.apiKey}` } });
        t.equal(res3.statusCode, 403);
        t.equal(res3.headers["content-type"], "application/json; charset=utf-8");
        t.equal(res3.headers["x-ratelimit-limit"], 20);
        t.equal(res3.headers["x-ratelimit-remaining"], 0);
        t.equal(res3.headers["retry-after"], 120000);
        t.same(BannedResponse("127.0.0.1"), JSON.parse(res3.payload));
    }

    // Wait two minutes and try again, should be a successful request
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 122000);
    const res4 = await app.inject({ url: "/", headers: { authorization: `Bearer: ${apiKey.apiKey}` } });
    t.equal(res4.statusCode, 200);
    t.equal(res4.headers["x-ratelimit-limit"], 20);
    t.equal(res4.headers["x-ratelimit-remaining"], 19);
    t.equal(res4.payload, "hello!");

    // Quit and teardown
    await redis.quit();
    await postgresConn.close();
    t.end();
});
