import fe from "@fastify/error";
import UnderPressure, {
    TYPE_EVENT_LOOP_DELAY,
    TYPE_EVENT_LOOP_UTILIZATION,
    TYPE_HEAP_USED_BYTES,
    TYPE_RSS_BYTES,
} from "@fastify/under-pressure";

// eslint-disable-next-line @rushstack/typedef-var
const UnderPressureError = fe("FST_UNDER_PRESSURE", "Service Unavailable", 503);

export const buildUnderPressureConfig = (): UnderPressure.UnderPressureOptions => ({
    // 750ms of delay
    maxEventLoopDelay: 750,

    // 200MB for rss, 75MB for the heap
    maxHeapUsedBytes: 75_000_000,
    maxRssBytes: 200_000_000,

    // 98% event loop utilization
    maxEventLoopUtilization: 0.98,

    // Expose the status route with a metrics object
    exposeStatusRoute: {
        routeResponseSchemaOpts: {
            metrics: {
                type: "object",
                properties: {
                    rssBytes: { type: "number" },
                    heapUsed: { type: "number" },
                    eventLoopDelay: { type: "number" },
                    eventLoopUtilized: { type: "number" },
                },
            },
        },
        url: "/status",
        routeOpts: {
            logLevel: "debug",
        },
    },

    // eslint-disable-next-line @typescript-eslint/naming-convention
    pressureHandler: async (request, _reply, type, value) => {
        switch (type) {
            case TYPE_HEAP_USED_BYTES: {
                request.log.warn(`Too many heap bytes used: ${value}bytes`);
                break;
            }
            case TYPE_RSS_BYTES: {
                request.log.warn(`Too many rss bytes used: ${value}bytes`);
                break;
            }
            case TYPE_EVENT_LOOP_DELAY: {
                request.log.warn(`Event loop taking too long: ${value}ms`);
                break;
            }
            case TYPE_EVENT_LOOP_UTILIZATION: {
                request.log.warn(`Event loop exceeded 98% utilization: ${value}%`);
                break;
            }
        }
        throw new UnderPressureError();
    },

    // Health check function
    healthCheck: async (fastifyInstance) => {
        return {
            metrics: fastifyInstance.memoryUsage(),
        };
    },
});

export default buildUnderPressureConfig;
