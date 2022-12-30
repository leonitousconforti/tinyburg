import type { Redis } from "ioredis";
import type { RateLimitPluginOptions } from "@fastify/rate-limit";

export const buildRateLimitConfig = (redis: Redis): RateLimitPluginOptions => ({
    global: true,
    ban: 3,
    timeWindow: "2 minute",
    redis,

    // Key Generator should try to use the api key id otherwise fall back to IP
    keyGenerator: function (request) {
        const key = request.apiKey?.id || request.clientIP;
        request.log.debug(`Using identifier ${key} for rate-limiting`);
        return key;
    },

    // Max function is based on the apiKeyId that gets set in the OnRequest hook
    async max(request) {
        const rl = request.apiKey?.rateLimitPerWindow || 5;
        request.log.debug(`This request is rate-limited to ${rl} requests per 2 minute window`);

        // Update the last used date on the api key
        if (request.apiKey) {
            request.apiKey.lastUsed = new Date();
            request.log.debug(`Set api key last used date to ${request.apiKey.lastUsed.toDateString()}`);
            await request.apiKey.save();
        }

        return rl;
    },

    // Write some nice messages when rate limit is hit
    errorResponseBuilder: (request, context) => {
        if (context.ban) {
            return {
                statusCode: 403,
                error: "Forbidden",
                message: `You can not access this service as you have sent too many requests that exceed your rate limit. Your IP: ${request.clientIP}`,
            };
        }

        return {
            statusCode: 429,
            error: "Too Many Requests",
            message: `You hit the rate limit, Slow down please! You can retry in ${context.after}`,
        };
    },
});
