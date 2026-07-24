import { Array, Effect, Function, Graph, type Schema } from "effect";

import type { NimblebitConfig } from "@tinyburg/nimblebit-sdk";

import { Repository } from "../domain/model.ts";

export const toDirectedGraph = Effect.gen(function* () {
    const repo = yield* Repository;
    const entries = yield* repo.currentFriendships();

    const graph = Graph.directed<Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema>, undefined>((mutable) => {
        // Add all players as nodes
        for (const player of Array.flatten(entries)) {
            Graph.addNode(mutable, player);
        }

        // Lookup map from player ID to node index
        const nodeIndexByData = Function.pipe(
            Graph.entries(Graph.nodes(mutable)),
            Array.fromIterable,
            Array.map(([x, y]) => [y, x] as const),
            (entries) => new Map(entries)
        );

        // Add all directed edges
        for (const [fromPlayer, toPlayer] of entries) {
            const fromNode = nodeIndexByData.get(fromPlayer)!;
            const toNode = nodeIndexByData.get(toPlayer)!;
            Graph.addEdge(mutable, fromNode, toNode, void 0);
        }
    });

    return graph;
});

export const toUndirectedGraph = Effect.gen(function* () {
    const repo = yield* Repository;
    const entries = yield* repo.mutualFriendships();

    const graph = Graph.undirected<Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema>, undefined>((mutable) => {
        // Add all players as nodes
        for (const player of Array.flatten(entries)) {
            Graph.addNode(mutable, player);
        }

        // Lookup map from player ID to node index
        const nodeIndexByData = Function.pipe(
            Graph.entries(Graph.nodes(mutable)),
            Array.fromIterable,
            Array.map(([x, y]) => [y, x] as const),
            (entries) => new Map(entries)
        );

        // Add all undirected edges
        for (const [playerA, playerB] of entries) {
            const nodeA = nodeIndexByData.get(playerA)!;
            const nodeB = nodeIndexByData.get(playerB)!;
            Graph.addEdge(mutable, nodeA, nodeB, void 0);
        }
    });

    return graph;
});
