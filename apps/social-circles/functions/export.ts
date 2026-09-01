/**
 * The published dataset, as a graph.
 *
 * Nodes are labelled `game:playerId` rather than by friend code alone. Nimblebit
 * reuses codes across games, so a graph keyed on the code would silently merge
 * two different people into one node and invent edges between them: exactly the
 * kind of error that looks like a finding.
 */

import { Array, Effect, Function, Graph } from "effect";

import { GraphRepository } from "../domain/graph.ts";
import { gamePlayerKey } from "../shared/games.ts";

/** `[game, a, b]` as the views return it, flattened to the two node labels. */
const endpoints = (entry: readonly [string, string, string]): readonly [string, string] => {
    const [game, a, b] = entry;
    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const asGame = game as Parameters<typeof gamePlayerKey>[0]["game"];
    return [gamePlayerKey({ game: asGame, playerId: a }), gamePlayerKey({ game: asGame, playerId: b })];
};

/** Every node label in the dataset, and the pairs to join, computed once. */
const layout = (entries: ReadonlyArray<readonly [string, string, string]>) => {
    const pairs = entries.map(endpoints);
    return { pairs, labels: Array.dedupe(pairs.flatMap(([from, to]) => [from, to])) };
};

/** Maps each node's label back to the index the graph gave it. */
const indexByLabel = (nodes: Iterable<readonly [number, string]>) =>
    Function.pipe(
        Array.fromIterable(nodes),
        Array.map(([index, data]) => [data, index] as const),
        (indexed) => new Map(indexed)
    );

export const toDirectedGraph = Effect.gen(function* () {
    const repo = yield* GraphRepository;
    const { labels, pairs } = layout(yield* repo.currentFriendships());

    return Graph.directed<string, undefined>((mutable) => {
        for (const label of labels) Graph.addNode(mutable, label);
        const index = indexByLabel(Graph.entries(Graph.nodes(mutable)));
        for (const [from, to] of pairs) {
            Graph.addEdge(mutable, index.get(from)!, index.get(to)!, void 0);
        }
    });
});

export const toUndirectedGraph = Effect.gen(function* () {
    const repo = yield* GraphRepository;
    const { labels, pairs } = layout(yield* repo.mutualFriendships());

    return Graph.undirected<string, undefined>((mutable) => {
        for (const label of labels) Graph.addNode(mutable, label);
        const index = indexByLabel(Graph.entries(Graph.nodes(mutable)));
        for (const [a, b] of pairs) {
            Graph.addEdge(mutable, index.get(a)!, index.get(b)!, void 0);
        }
    });
});
