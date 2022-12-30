import fe from "@fastify/error";
import UnderPressure, {
    TYPE_EVENT_LOOP_DELAY,
    TYPE_EVENT_LOOP_UTILIZATION,
    TYPE_HEAP_USED_BYTES,
    TYPE_RSS_BYTES,
} from "@fastify/under-pressure";

const UnderPressureError = fe("FST_UNDER_PRESSURE", "Service Unavailable", 503);

export const buildUnderPressureConfig = (): UnderPressure.default.UnderPressureOptions => ({
    // 750ms of delay
    maxEventLoopDelay: 750,

    // 200MB for rss, 75MB for the heap
    maxHeapUsedBytes: 75000000,
    maxRssBytes: 200000000,

    // 95% event loop utilization
    maxEventLoopUtilization: 0.95,

    // Expose the status route with a metrics object
    exposeStatusRoute: {
        routeResponseSchemaOpts: {
            metrics: {
                type: "object",
                properties: {
                    eventLoopDelay: { type: "number" },
                    rssBytes: { type: "number" },
                    heapUsed: { type: "number" },
                    eventLoopUtilized: { type: "number" },
                },
            },
        },

        // Status url and set log messages to debug
        url: "/status",
        routeOpts: {
            logLevel: "debug",
        },
    },

    pressureHandler: (request, reply, type, value) => {
        if (type === TYPE_HEAP_USED_BYTES) {
            request.log.warn(`Too many heap bytes used: ${value}bytes`);
        } else if (type === TYPE_RSS_BYTES) {
            request.log.warn(`Too many rss bytes used: ${value}bytes`);
        } else if (type === TYPE_EVENT_LOOP_DELAY) {
            request.log.warn(`Event loop taking too long: ${value}ms`);
        } else if (type === TYPE_EVENT_LOOP_UTILIZATION) {
            request.log.warn(`Event loop exceeded 95% utilization: ${value}%`);
        }

        reply.status(503).header("Retry-After", "10");
        throw new UnderPressureError();
    },

    // Health check function
    healthCheck: async (fastifyInstance) => {
        return {
            metrics: fastifyInstance.memoryUsage(),
        };
    },
});
