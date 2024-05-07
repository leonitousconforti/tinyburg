import { z } from "zod";

export const zodPlayerId: z.ZodString = z
    .string()
    .max(5)
    .regex(/^([\dA-Z]*)$/gm);

export type ZodPlayerId = z.infer<typeof zodPlayerId>;

export const parsePlayerId = (playerId: unknown): ZodPlayerId => zodPlayerId.parse(playerId);
export const isValidPlayerId = (playerId: unknown): boolean => zodPlayerId.safeParse(playerId).success;
