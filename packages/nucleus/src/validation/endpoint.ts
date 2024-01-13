import { z } from "zod";
import { serverEndpoints } from "../contact-server.js";

export const zodEndpoint: z.ZodEffects<z.ZodString, string, string> = z
    .string({
        required_error: "Endpoint is required",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        invalid_type_error: "You tried to use something that was not a string as your endpoint",
    })
    .refine(
        (x) => Object.values(serverEndpoints).includes(x as (typeof serverEndpoints)[keyof typeof serverEndpoints]),
        (x) => ({ message: `${x} is not an implemented endpoint` })
    );

export type ZodEndpoint = z.infer<typeof zodEndpoint>;

export const parseEndpoint = (endpoint: unknown): ZodEndpoint => zodEndpoint.parse(endpoint);
export const isValidEndpoint = (endpoint: unknown): boolean => zodEndpoint.safeParse(endpoint).success;
