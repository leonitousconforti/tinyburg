/**
 * The scope tree as a picker, shared by the create-key form and the admin
 * scope editor.
 *
 * One section per game. Its header is the game itself, then the game's
 * `:read` and `:write` branches, which span every area; under those, one
 * card per area with the area, its `:read` branch and the leaves under it,
 * then its `:write` branch and its leaves, each a plain checkbox line
 * indented one step deeper than the one above. Picking a node grants
 * everything beneath it, so the lines under a picked node show as checked and
 * cannot be unpicked on their own - they are implied, not chosen. A node the
 * page does not offer at all (the writes, on the self-serve form) is still
 * listed, muted with its box disabled, so a visitor can see what exists and
 * what they would have to ask for.
 *
 * A selection is the nodes that were picked and nothing beneath them: a key
 * that lists both `tinytower:read` and `tinytower:sync:pull_save` says nothing
 * the shorter one does not, so {@link toggleScope} keeps it to the shorter one.
 */

import type { CatalogArea, CatalogGame, CatalogNode } from "./backend.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

const areaNodes = (area: CatalogArea): ReadonlyArray<CatalogNode> => [
    area,
    area.read,
    ...area.read.children,
    area.write,
    ...area.write.children,
];

/** Every node in the tree, in display order. */
export const flatten = (catalog: ReadonlyArray<CatalogGame>): ReadonlyArray<CatalogNode> =>
    catalog.flatMap((game) => [game, game.read, game.write, ...game.areas.flatMap(areaNodes)]);

/** The catalog as a lookup, for the chips on a key row. */
export const descriptionsOf = (catalog: ReadonlyArray<CatalogGame>): ReadonlyMap<string, string> =>
    new Map(flatten(catalog).map((node) => [node.name, node.description]));

/**
 * Node name to the names of every node above it. What a node is beneath is
 * what grants it: an area's read branch is under the area and under the
 * game's read branch, both of which are under the game.
 */
const ancestorsOf = (catalog: ReadonlyArray<CatalogGame>): ReadonlyMap<string, ReadonlyArray<string>> =>
    new Map(
        catalog.flatMap((game): Array<[string, ReadonlyArray<string>]> => [
            [game.read.name, [game.name]],
            [game.write.name, [game.name]],
            ...game.areas.flatMap((area): Array<[string, ReadonlyArray<string>]> => [
                [area.name, [game.name]],
                [area.read.name, [area.name, game.read.name, game.name]],
                [area.write.name, [area.name, game.write.name, game.name]],
                ...area.read.children.map((leaf): [string, ReadonlyArray<string>] => [
                    leaf.name,
                    [area.read.name, area.name, game.read.name, game.name],
                ]),
                ...area.write.children.map((leaf): [string, ReadonlyArray<string>] => [
                    leaf.name,
                    [area.write.name, area.name, game.write.name, game.name],
                ]),
            ]),
        ])
    );

/** Node name to the names of every node beneath it: the inverse of {@link ancestorsOf}. */
const descendantsOf = (catalog: ReadonlyArray<CatalogGame>): ReadonlyMap<string, ReadonlyArray<string>> => {
    const below = new Map<string, Array<string>>();
    for (const [name, above] of ancestorsOf(catalog)) {
        for (const ancestor of above) {
            const list = below.get(ancestor) ?? [];
            list.push(name);
            below.set(ancestor, list);
        }
    }
    return below;
};

/**
 * Toggles one scope in a selection. Picking a node drops everything beneath
 * it from the selection, since the node now implies them; unpicking it leaves
 * the selection as it was without the node, so nothing beneath comes back
 * picked that was not picked before.
 */
export const toggleScope = (
    selected: ReadonlyArray<string>,
    name: string,
    catalog: ReadonlyArray<CatalogGame>
): ReadonlyArray<string> => {
    if (selected.includes(name)) return selected.filter((held) => held !== name);
    const implied = new Set(descendantsOf(catalog).get(name) ?? []);
    return [...selected.filter((held) => !implied.has(held)), name];
};

export interface PickerOptions<M> {
    readonly catalog: ReadonlyArray<CatalogGame>;
    readonly selected: ReadonlyArray<string>;
    readonly onToggle: (name: string) => M;
    /**
     * Whether this page offers a node at all. A node it does not is still
     * listed, muted and unpickable, so the tree reads the same everywhere.
     */
    readonly selectable: (node: CatalogNode) => boolean;
    /**
     * The game whose tree is on screen. One game shows at a time, chosen by
     * its tab; a name that matches no game (like the empty initial value)
     * falls back to the first. The selection spans every game regardless of
     * which is shown, so switching tabs never changes what is picked.
     */
    readonly activeGame: string;
    readonly onSelectGame: (name: string) => M;
}

type Rank = "game" | "area" | "branch" | "leaf";

/**
 * The name as a row shows it. Under a game's heading every name starts with
 * the game's, which the heading has already said; the rows drop it so the
 * eye lands on what differs. Display only: the scope itself, and the chips
 * on a key, keep the full name.
 */
const shown = (name: string, strip: string | undefined): string =>
    strip !== undefined && name.startsWith(`${strip}:`) ? name.slice(strip.length + 1) : name;

const line = <M>(
    h: HtmlBuilder<M>,
    options: PickerOptions<M>,
    ancestors: ReadonlyMap<string, ReadonlyArray<string>>,
    node: CatalogNode,
    rank: Rank,
    strip?: string
): Html => {
    const picked = options.selected.includes(node.name);
    const implied = (ancestors.get(node.name) ?? []).some((above) => options.selected.includes(above));
    const offered = options.selectable(node);
    const enabled = offered && !implied;

    // Every branch and leaf has a box, disabled where it cannot be picked:
    // because an ancestor already grants it, or because this page does not
    // offer it. An unoffered game or area gets none, being a heading over
    // halves of which one may well be on offer.
    const control =
        !offered && (rank === "game" || rank === "area")
            ? h.empty
            : h.input([
                  h.Type("checkbox"),
                  h.Class("mt-1 shrink-0"),
                  h.Checked(picked || implied),
                  h.Disabled(!enabled),
                  ...(enabled ? [h.OnClick(options.onToggle(node.name))] : []),
              ]);

    const tone = offered ? (implied ? "text-gray-500" : "text-gray-800") : "text-gray-400";
    const size =
        rank === "game" ? "text-2xl" : rank === "area" ? "text-xl" : rank === "branch" ? "text-lg" : "text-base";

    return h.label(
        [h.Class(`flex items-start gap-2 ${enabled ? "cursor-pointer" : ""}`.trim())],
        [
            control,
            h.span(
                [h.Class("min-w-0 leading-snug")],
                [
                    h.span([h.Class(`font-mono ${size} ${tone}`), h.Title(node.name)], [shown(node.name, strip)]),
                    h.span([h.Class("font-mono text-sm text-gray-500")], [` · ${node.description}`]),
                ]
            ),
        ]
    );
};

const branchBlock = <M>(
    h: HtmlBuilder<M>,
    options: PickerOptions<M>,
    ancestors: ReadonlyMap<string, ReadonlyArray<string>>,
    branch: CatalogArea["read"],
    strip: string
): Html =>
    h.div(
        [h.Class("flex flex-col gap-1")],
        [
            line(h, options, ancestors, branch, "branch", strip),
            h.div(
                [h.Class("ml-5 flex flex-col gap-0.5")],
                branch.children.map((leaf) => line(h, options, ancestors, leaf, "leaf", strip))
            ),
        ]
    );

const areaCard = <M>(
    h: HtmlBuilder<M>,
    options: PickerOptions<M>,
    ancestors: ReadonlyMap<string, ReadonlyArray<string>>,
    area: CatalogArea,
    strip: string
): Html =>
    h.div(
        [h.Class("flex flex-col gap-2 rounded-lg border-2 border-gray-300 bg-white p-3")],
        [
            line(h, options, ancestors, area, "area", strip),
            h.div(
                [h.Class("ml-5 flex flex-col gap-2")],
                [
                    branchBlock(h, options, ancestors, area.read, strip),
                    branchBlock(h, options, ancestors, area.write, strip),
                ]
            ),
        ]
    );

const tabClass =
    "font-mono -mb-0.5 cursor-pointer rounded-t-lg border-2 border-b-0 px-3 py-2 text-base transition-colors";
const activeTabTone = "border-gray-300 bg-white text-gray-800";
const inactiveTabTone = "border-transparent bg-gray-100 text-gray-500 hover:text-gray-800";

/** One game's block: its heading and branches, then a card per area. */
const gameSection = <M>(
    h: HtmlBuilder<M>,
    options: PickerOptions<M>,
    ancestors: ReadonlyMap<string, ReadonlyArray<string>>,
    game: CatalogGame
): Html =>
    h.section(
        [h.Class("flex flex-col gap-3")],
        [
            h.div(
                [h.Class("flex flex-col gap-1")],
                [
                    line(h, options, ancestors, game, "game"),
                    h.div(
                        [h.Class("ml-5 flex flex-col gap-1")],
                        [
                            line(h, options, ancestors, game.read, "branch"),
                            line(h, options, ancestors, game.write, "branch"),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-3 sm:grid-cols-2")],
                game.areas.map((area) => areaCard(h, options, ancestors, area, game.name))
            ),
        ]
    );

/**
 * The tree as tabs: one tab per game, and only the chosen game's tree below
 * it, its areas two up where there is room. Every game's scopes are still in
 * the one selection, so a key can span games; the tabs only decide what is on
 * screen.
 */
export const scopePicker = <M>(h: HtmlBuilder<M>, options: PickerOptions<M>): Html => {
    const ancestors = ancestorsOf(options.catalog);
    const active = options.catalog.find((game) => game.name === options.activeGame) ?? options.catalog[0];
    if (active === undefined) return h.empty;
    return h.div(
        [h.Class("flex flex-col gap-3")],
        [
            h.div(
                [h.Class("flex flex-wrap gap-1 border-b-2 border-gray-300"), h.Role("tablist")],
                options.catalog.map((game) => {
                    const selected = game.name === active.name;
                    return h.button(
                        [
                            h.Type("button"),
                            h.Role("tab"),
                            h.Attribute("aria-selected", selected ? "true" : "false"),
                            h.Title(game.description),
                            h.Class(`${tabClass} ${selected ? activeTabTone : inactiveTabTone}`),
                            h.OnClick(options.onSelectGame(game.name)),
                        ],
                        [game.name]
                    );
                })
            ),
            gameSection(h, options, ancestors, active),
        ]
    );
};
