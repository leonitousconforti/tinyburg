import { z } from "zod";

export const zodGame: z.ZodEnum<["TinyTower", "LegoTower", "TinyTowerVegas"]> = z.enum([
    "TinyTower",
    "LegoTower",
    "TinyTowerVegas",
]);

export type ZodGame = z.infer<typeof zodGame>;

export const parseGame = (game: unknown): ZodGame => zodGame.parse(game);
export const isValidGame = (game: unknown): boolean => zodGame.safeParse(game).success;
