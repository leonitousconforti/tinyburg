import { z } from "zod";

export const zodSalt: z.ZodNumber = z.coerce
    .number({
        required_error: "Random salt is required",
        invalid_type_error: "Why are you trying to give me a string for the random salt?",
    })
    .int({ message: "Why is the random salt you gave me not an integer value" })
    .gte(-2_147_483_648, { message: "The salt you gave me is too large" })
    .lte(2_147_483_647, { message: "The salt you game me is too small" });

export type ZodSalt = z.infer<typeof zodSalt>;

export const parseSalt = (salt: unknown): ZodSalt => zodSalt.parse(salt);
export const isValidSalt = (salt: unknown): boolean => zodSalt.safeParse(salt).success;
