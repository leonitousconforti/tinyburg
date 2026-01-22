import { NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Effect, Schema } from "effect";

import { Repository } from "../domain/model.ts";

const consent = Effect.fnUntraced(function* (playerIdString: string) {
    const repo = yield* Repository;
    const playerId = yield* Schema.decode(NimblebitConfig.PlayerIdSchema)(playerIdString);
    return yield* repo.players.insertVoid({ playerId, firstSeenAt: undefined });
});

const purge = Effect.fnUntraced(function* (playerIdString: string) {
    const repo = yield* Repository;
    const playerId = yield* Schema.decode(NimblebitConfig.PlayerIdSchema)(playerIdString);
    return yield* repo.players.delete(playerId);
});
