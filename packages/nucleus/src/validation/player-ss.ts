import { z } from "zod";

export const zodPlayerSs: z.ZodString = z.string().uuid();
export type ZodPlayerSs = z.infer<typeof zodPlayerSs>;

export const parsePlayerSs = (playerSs: unknown): ZodPlayerSs => zodPlayerSs.parse(playerSs);
export const isValidPlayerSs = (playerSs: unknown): boolean => zodPlayerSs.safeParse(playerSs).success;
