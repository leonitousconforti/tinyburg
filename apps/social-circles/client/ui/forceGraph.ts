/**
 * The circle, drawn as a force-directed graph.
 *
 * ## Why the layout is computed once, not animated
 *
 * A force layout is usually a running simulation. Here it is a pure function
 * from the graph to a set of coordinates, run to completion the moment the data
 * arrives, with the result kept in the model. The view is then an ordinary pure
 * render of fixed positions.
 *
 * That suits foldkit far better than a ticking simulation would: no
 * subscription, no frame loop to keep alive across route changes, and the same
 * input always produces the same picture, so a re-render never reshuffles a
 * graph the visitor was reading. Nothing here calls `Math.random`, for the same
 * reason.
 *
 * ## Why the games are clustered
 *
 * A friendship cannot span games, so the graph is always at least one
 * disconnected component per game. Left to a plain force layout those
 * components drift wherever the repulsion happens to push them. Each game
 * instead gets an anchor and a gentle pull toward it, which turns the drift into
 * a deliberate arrangement: one labelled constellation per game, in one picture.
 *
 * ## Colour
 *
 * Colour carries the game, in the fixed order of the catalog, never cycled.
 * Position and a direct label on each cluster carry it too, which is what lets
 * the picture stay readable past the three slots this palette can hold apart on
 * an all-pairs basis, and what provides the relief the lighter slots need
 * against a white surface. The per-tower circle list under each row is the table
 * view of the same data.
 */

import { Schema as S } from "effect";

import type { GraphEdge, GraphNode } from "../../shared/api.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { GameId, gamePlayerKey } from "../../shared/games.ts";

/**
 * The categorical palette, in catalog order.
 *
 * These are the eight validated slots, assigned to games by position and never
 * cycled. A ninth game would not get a generated colour: it would want folding
 * into the "other games" treatment rather than a new hue.
 */
const GAME_COLORS: Record<GameId, string> = {
    tinytower: "#2a78d6",
    tinytowerclassic: "#eb6834",
    pocketplanes: "#1baf7a",
    pockettrains: "#eda100",
    legotower: "#e87ba4",
    discozoo: "#008300",
    bitcity: "#4a3aa7",
    tinytowervegas: "#e34948",
};

/**
 * @since 1.0.0
 * @category Colors
 */
export const colorFor = (game: GameId): string => GAME_COLORS[game];

// The space the simulation runs in. The drawing is framed by its own bounding
// box afterwards, so these only set the scale the forces work at, not the
// picture's final shape.
const WIDTH = 720;
const HEIGHT = 460;
const PADDING = 44;
const ITERATIONS = 320;

/** Room around the drawing for the labels, which overhang their marks. */
const PAD_X = 52;
const PAD_TOP = 34;
const PAD_BOTTOM = 30;

/** How far above its topmost member a game's label sits. */
const CLUSTER_LABEL_GAP = 16;

/** Shortest the frame may be relative to its width, so a line of nodes is not a strip. */
const MIN_ASPECT = 0.62;

/**
 * How much of the usual repulsion applies between nodes of different games.
 *
 * Within a cluster, repulsion is what spaces people out. Between clusters it
 * only fights the anchors, and at full strength it wins: two games drift to
 * opposite ends of a very wide frame, and everything is drawn small to fit.
 * Enough to stop clusters overlapping, not enough to push them apart.
 */
const CROSS_GAME_REPULSION = 0.3;

/** How strongly a node is held to its own game's centre. */
const ANCHOR_PULL = 0.3;

/**
 * The smallest frame worth drawing. Without a floor, a circle of one or two
 * people fits a frame barely larger than the marks themselves, and the browser
 * scales that up until a single dot fills the card.
 */
const MIN_FRAME_WIDTH = 460;
const MIN_FRAME_HEIGHT = 260;

/** The angle that spreads successive points most evenly around a centre. */
const GOLDEN_ANGLE = 2.399_963_229_728_653;

interface Point {
    x: number;
    y: number;
}

/**
 * The laid-out graph is kept in the page model rather than recomputed on every
 * render, so these are schemas: the model is one.
 *
 * @since 1.0.0
 * @category Models
 */
export const PlacedNode = S.Struct({
    key: S.String,
    game: GameId,
    playerId: S.String,
    mine: S.Boolean,
    x: S.Finite,
    y: S.Finite,
});
export type PlacedNode = typeof PlacedNode.Type;

/**
 * @since 1.0.0
 * @category Models
 */
export const PlacedEdge = S.Struct({
    game: GameId,
    x1: S.Finite,
    y1: S.Finite,
    x2: S.Finite,
    y2: S.Finite,
});
export type PlacedEdge = typeof PlacedEdge.Type;

/**
 * @since 1.0.0
 * @category Models
 */
export const PlacedCluster = S.Struct({ game: GameId, x: S.Finite, y: S.Finite, count: S.Finite });
export type PlacedCluster = typeof PlacedCluster.Type;

/**
 * @since 1.0.0
 * @category Models
 */
export const GraphLayout = S.Struct({
    nodes: S.Array(PlacedNode),
    edges: S.Array(PlacedEdge),
    clusters: S.Array(PlacedCluster),
    /** The frame the drawing fills, fitted to the drawing rather than fixed. */
    viewBox: S.Struct({ x: S.Finite, y: S.Finite, width: S.Finite, height: S.Finite }),
});
export type GraphLayout = typeof GraphLayout.Type;

/** Where each game's constellation sits: one centre, evenly spaced on a ring. */
const anchorsFor = (count: number): ReadonlyArray<Point> => {
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    if (count <= 1) return [{ x: cx, y: cy }];

    const radius = Math.min(WIDTH, HEIGHT) * (count === 2 ? 0.24 : 0.3);
    return Array.from({ length: count }, (_, index) => {
        // Start at the top so a two-game layout reads left/right rather than
        // stacked, which suits a landscape canvas.
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + (count === 2 ? Math.PI / 2 : 0);
        return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
};

/**
 * Runs the layout.
 *
 * Fruchterman-Reingold: every pair of nodes pushes apart, every edge pulls
 * together, and a cooling schedule shrinks the step size so the arrangement
 * settles instead of oscillating. The per-game anchor pull is the third force.
 *
 * @since 1.0.0
 * @category Layout
 */
export const layout = (
    nodes: ReadonlyArray<GraphNode>,
    edges: ReadonlyArray<GraphEdge>,
    gameOrder: ReadonlyArray<GameId>
): GraphLayout => {
    if (nodes.length === 0) return { nodes: [], edges: [], clusters: [], viewBox: { x: 0, y: 0, width: 0, height: 0 } };

    // Games in catalog order, restricted to those actually present.
    const games = gameOrder.filter((game) => nodes.some((node) => node.game === game));
    const anchors = anchorsFor(games.length);
    const anchorOf = new Map(games.map((game, index) => [game, anchors[index]]));

    const indexOf = new Map(nodes.map((node, index) => [gamePlayerKey(node), index]));

    // Seeded deterministically: a golden-angle spiral around each node's own
    // anchor, so the starting arrangement is already spread out and identical
    // on every run.
    const seen = new Map<GameId, number>();
    const positions: Array<Point> = nodes.map((node) => {
        const anchor = anchorOf.get(node.game)!;
        const rank = seen.get(node.game) ?? 0;
        seen.set(node.game, rank + 1);
        const angle = rank * GOLDEN_ANGLE;
        const radius = 14 * Math.sqrt(rank + 1);
        return { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius };
    });

    const pairs = edges
        .map(
            (edge) =>
                [
                    indexOf.get(gamePlayerKey({ game: edge.game, playerId: edge.a })),
                    indexOf.get(gamePlayerKey({ game: edge.game, playerId: edge.b })),
                ] as const
        )
        .filter((pair): pair is readonly [number, number] => pair[0] !== undefined && pair[1] !== undefined);

    const area = (WIDTH - PADDING * 2) * (HEIGHT - PADDING * 2);
    const ideal = Math.sqrt(area / nodes.length) * 0.62;
    let temperature = Math.min(WIDTH, HEIGHT) / 8;

    const displacement: Array<Point> = nodes.map(() => ({ x: 0, y: 0 }));

    for (let step = 0; step < ITERATIONS; step = step + 1) {
        for (const d of displacement) {
            d.x = 0;
            d.y = 0;
        }

        // Repulsion, across every pair rather than within a game, so two
        // clusters cannot end up sitting on top of each other.
        for (let i = 0; i < nodes.length; i = i + 1) {
            for (let j = i + 1; j < nodes.length; j = j + 1) {
                let dx = positions[i].x - positions[j].x;
                let dy = positions[i].y - positions[j].y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                // Two nodes exactly on top of one another have no direction to
                // separate along. Nudge them apart by index so the choice stays
                // deterministic rather than random.
                if (distance < 0.01) {
                    dx = ((i % 7) - 3) * 0.01 + 0.01;
                    dy = ((j % 5) - 2) * 0.01 + 0.01;
                    distance = Math.sqrt(dx * dx + dy * dy);
                }

                const sameGame = nodes[i].game === nodes[j].game;
                const force = ((ideal * ideal) / distance) * (sameGame ? 1 : CROSS_GAME_REPULSION);
                const ux = (dx / distance) * force;
                const uy = (dy / distance) * force;
                displacement[i].x += ux;
                displacement[i].y += uy;
                displacement[j].x -= ux;
                displacement[j].y -= uy;
            }
        }

        // Attraction along edges.
        for (const [a, b] of pairs) {
            const dx = positions[a].x - positions[b].x;
            const dy = positions[a].y - positions[b].y;
            const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
            const force = (distance * distance) / ideal;
            const ux = (dx / distance) * force;
            const uy = (dy / distance) * force;
            displacement[a].x -= ux;
            displacement[a].y -= uy;
            displacement[b].x += ux;
            displacement[b].y += uy;
        }

        // The pull that keeps each game together, weak enough that the edges
        // still decide the shape within a cluster.
        for (let i = 0; i < nodes.length; i = i + 1) {
            const anchor = anchorOf.get(nodes[i].game)!;
            displacement[i].x += (anchor.x - positions[i].x) * ANCHOR_PULL;
            displacement[i].y += (anchor.y - positions[i].y) * ANCHOR_PULL;
        }

        // Move, capped by the temperature, then cool.
        for (let i = 0; i < nodes.length; i = i + 1) {
            const d = displacement[i];
            const magnitude = Math.max(Math.sqrt(d.x * d.x + d.y * d.y), 0.01);
            const capped = Math.min(magnitude, temperature);
            positions[i].x += (d.x / magnitude) * capped;
            positions[i].y += (d.y / magnitude) * capped;
        }
        temperature = temperature * 0.975;
    }

    // The viewport is fitted to the drawing rather than the drawing to a fixed
    // viewport. A circle of four people and one of forty want very different
    // shapes, and a fixed canvas would frame the small one in dead space.
    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);
    let minX = Math.min(...xs) - PAD_X;
    let maxX = Math.max(...xs) + PAD_X;
    let minY = Math.min(...ys) - PAD_TOP;
    let maxY = Math.max(...ys) + PAD_BOTTOM;

    // A run of nodes in a line would otherwise produce a letterbox strip. Grow
    // the short axis around its own centre until the frame is a sane shape.
    if (maxY - minY < (maxX - minX) * MIN_ASPECT) {
        const grow = ((maxX - minX) * MIN_ASPECT - (maxY - minY)) / 2;
        minY = minY - grow;
        maxY = maxY + grow;
    }

    // Then hold it to a floor, so a very small circle is drawn small rather
    // than magnified to fill the card.
    if (maxX - minX < MIN_FRAME_WIDTH) {
        const grow = (MIN_FRAME_WIDTH - (maxX - minX)) / 2;
        minX = minX - grow;
        maxX = maxX + grow;
    }
    if (maxY - minY < MIN_FRAME_HEIGHT) {
        const grow = (MIN_FRAME_HEIGHT - (maxY - minY)) / 2;
        minY = minY - grow;
        maxY = maxY + grow;
    }

    const placed: Array<PlacedNode> = nodes.map((node, index) => ({
        key: gamePlayerKey(node),
        game: node.game,
        playerId: node.playerId,
        mine: node.mine,
        x: positions[index].x,
        y: positions[index].y,
    }));

    const placedEdges: Array<PlacedEdge> = pairs.map(([a, b]) => ({
        game: nodes[a].game,
        x1: placed[a].x,
        y1: placed[a].y,
        x2: placed[b].x,
        y2: placed[b].y,
    }));

    // A cluster label sits above its own members.
    const clusters: Array<PlacedCluster> = games.map((game) => {
        const members = placed.filter((node) => node.game === game);
        const top = Math.min(...members.map((node) => node.y));
        const centre = members.reduce((total, node) => total + node.x, 0) / members.length;
        return { game, x: centre, y: top - CLUSTER_LABEL_GAP, count: members.length };
    });

    return {
        nodes: placed,
        edges: placedEdges,
        clusters,
        viewBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    };
};

/** Beyond this many people, labelling every node turns the picture into text. */
const LABEL_EVERY_NODE_UP_TO = 14;

const OWN_RADIUS = 9;
const FRIEND_RADIUS = 5.5;

/**
 * Renders a laid-out graph.
 *
 * @since 1.0.0
 * @category Views
 */
export const forceGraphView = <M>(
    h: HtmlBuilder<M>,
    graph: GraphLayout,
    labels: {
        readonly nameOf: (game: GameId) => string;
        readonly description: string;
        readonly you: string;
    }
): Html => {
    const labelAll = graph.nodes.length <= LABEL_EVERY_NODE_UP_TO;

    return h.svg(
        [
            h.ViewBox(`${graph.viewBox.x} ${graph.viewBox.y} ${graph.viewBox.width} ${graph.viewBox.height}`),
            h.Class("h-auto w-full"),
            h.Role("img"),
            h.AriaLabel(labels.description),
        ],
        [
            // Edges first so the nodes sit on top of them.
            h.g(
                [],
                graph.edges.map((edge) =>
                    h.line([
                        h.X1(String(edge.x1)),
                        h.Y1(String(edge.y1)),
                        h.X2(String(edge.x2)),
                        h.Y2(String(edge.y2)),
                        h.Stroke(colorFor(edge.game)),
                        h.StrokeWidth("2"),
                        h.StrokeOpacity("0.35"),
                        h.StrokeLinecap("round"),
                    ])
                )
            ),

            // The visitor's own towers get an outer ring as well as a bigger
            // mark, so they are findable without relying on size alone.
            h.g(
                [],
                graph.nodes
                    .filter((node) => node.mine)
                    .map((node) =>
                        h.circle([
                            h.Cx(String(node.x)),
                            h.Cy(String(node.y)),
                            h.R(String(OWN_RADIUS + 4)),
                            h.Fill("none"),
                            h.Stroke("#1a3a5c"),
                            h.StrokeWidth("2"),
                            h.StrokeOpacity("0.75"),
                        ])
                    )
            ),

            h.g(
                [],
                graph.nodes.map((node) =>
                    h.circle([
                        h.Cx(String(node.x)),
                        h.Cy(String(node.y)),
                        h.R(String(node.mine ? OWN_RADIUS : FRIEND_RADIUS)),
                        h.Fill(colorFor(node.game)),
                        // A 2px surface ring keeps touching marks legible.
                        h.Stroke("#ffffff"),
                        h.StrokeWidth("2"),
                    ])
                )
            ),

            h.g(
                [],
                graph.nodes
                    .filter((node) => node.mine || labelAll)
                    .map((node) =>
                        h.text(
                            [
                                h.X(String(node.x)),
                                h.Y(String(node.y + (node.mine ? OWN_RADIUS + 17 : FRIEND_RADIUS + 14))),
                                h.TextAnchor("middle"),
                                // Text wears text tokens, never the mark's colour.
                                h.Fill(node.mine ? "#1a3a5c" : "#52514e"),
                                h.FontSize(node.mine ? "13" : "12"),
                                h.Class("font-mono"),
                            ],
                            [node.mine ? `${node.playerId} (${labels.you})` : node.playerId]
                        )
                    )
            ),

            // The direct label per cluster: what makes the picture readable
            // without matching swatches to a legend.
            h.g(
                [],
                graph.clusters.map((cluster) =>
                    h.text(
                        [
                            h.X(String(cluster.x)),
                            h.Y(String(Math.max(cluster.y, 14))),
                            h.TextAnchor("middle"),
                            h.Fill("#2c3e50"),
                            h.FontSize("12"),
                            h.Class("font-pixel"),
                        ],
                        [labels.nameOf(cluster.game)]
                    )
                )
            ),
        ]
    );
};

/**
 * The legend. Always present when more than one game is drawn, so identity is
 * never carried by colour alone.
 *
 * @since 1.0.0
 * @category Views
 */
export const forceGraphLegend = <M>(
    h: HtmlBuilder<M>,
    games: ReadonlyArray<GameId>,
    nameOf: (game: GameId) => string
): Html =>
    h.div(
        [h.Class("flex flex-wrap items-center gap-4")],
        games.map((game) =>
            h.span(
                [h.Class("flex items-center gap-2")],
                [
                    h.svg(
                        [h.ViewBox("0 0 12 12"), h.Class("h-3 w-3"), h.AriaHidden(true)],
                        [h.circle([h.Cx("6"), h.Cy("6"), h.R("5"), h.Fill(colorFor(game))])]
                    ),
                    h.span([h.Class("font-mono text-base text-gray-600")], [nameOf(game)]),
                ]
            )
        )
    );
