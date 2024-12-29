import * as Schema from "effect/Schema";

export class Game extends Schema.Literal(
    "com.nimblebit.bitcity" as const,
    "com.nimblebit.tinytower" as const,
    "com.nimblebit.pocketfrogs" as const,
    "com.nimblebit.pocketplanes" as const,
    "com.nimblebit.pockettrains" as const
) {}

export type AnyGame = (typeof Game.literals)[number];
