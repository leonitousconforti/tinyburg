import { Effect, Schema } from "effect";

import { NimblebitConfig } from "@tinyburg/nimblebit-sdk";

import { Repository } from "../domain/model.ts";

export const consent = Effect.fnUntraced(function* (playerIdString: string) {
    const repo = yield* Repository;
    const playerId = yield* Schema.decodeEffect(NimblebitConfig.PlayerIdSchema)(playerIdString);
    return yield* repo.players.insertVoid({ playerId, firstSeenAt: undefined });
});

export const purge = Effect.fnUntraced(function* (playerIdString: string) {
    const repo = yield* Repository;
    const playerId = yield* Schema.decodeEffect(NimblebitConfig.PlayerIdSchema)(playerIdString);
    return yield* repo.players.delete(playerId);
});
