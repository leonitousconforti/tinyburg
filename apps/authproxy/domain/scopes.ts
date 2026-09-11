/**
 * The scopes this proxy hands out, read off the endpoints that enforce them.
 *
 * The tree is one `Scopes.Games` per game sdk: each game splits
 * into a `:read` and a `:write` branch spanning the whole game, and into
 * areas that each split the same way, with a leaf per endpoint beneath.
 * Every endpoint is annotated with its leaf and everything above it, so a
 * key holding any of those may call it. Nothing here names a scope on its
 * own.
 *
 * What is this proxy's own is the line between self-serve and elevated:
 * every `:read` node - a game's, an area's, and the leaves under them -
 * anyone signed in may grant themselves; every `:write` node, and every game
 * and area (which include their writes), is granted by hand. A line drawn on
 * the shape of the tree rather than on a list of names cannot name a scope
 * that does not exist, and moves with the tree when a game or an area is
 * added.
 *
 * The module also checks, when loaded, that the tree and the endpoints agree:
 * every scope the tree declares is on some endpoint, and every scope an
 * endpoint accepts is in the tree. A leaf added to one and not the other is
 * a scope that can be offered but never used, or used but never offered, and
 * the place to learn that is boot rather than a refused request.
 *
 * @since 1.0.0
 */

import * as BitCity from "@tinyburg/bitcity-sdk";
import * as DiscoZoo from "@tinyburg/disco-zoo-sdk";
import * as LegoTower from "@tinyburg/lego-tower-sdk";
import * as PocketPlanes from "@tinyburg/pocket-planes-sdk";
import * as PocketTrains from "@tinyburg/pocket-trains-sdk";
import * as Classic from "@tinyburg/tinytower-classic-sdk";
import { Endpoints, Scopes } from "@tinyburg/tinytower-sdk";
import * as TinyTowerVegas from "@tinyburg/tinytower-vegas-sdk";
import { ResourceServer } from "effect-oidc";

/**
 * Every game this proxy serves, in the order the dashboard lists them, and
 * the api each one enforces its scopes on. Adding a game is one line here
 * plus its routes in `index.ts`.
 */
const GAMES = [
    { games: Scopes.Games, all: Scopes.all },
    { games: Classic.Scopes.Games, all: Classic.Scopes.all },
    { games: PocketPlanes.Scopes.Games, all: PocketPlanes.Scopes.all },
    { games: PocketTrains.Scopes.Games, all: PocketTrains.Scopes.all },
    { games: LegoTower.Scopes.Games, all: LegoTower.Scopes.all },
    { games: DiscoZoo.Scopes.Games, all: DiscoZoo.Scopes.all },
    { games: BitCity.Scopes.Games, all: BitCity.Scopes.all },
    { games: TinyTowerVegas.Scopes.Games, all: TinyTowerVegas.Scopes.all },
] as const;

/** Every scope some endpoint of some game accepts. One call per api: `scopeCatalog` is generic over the api. */
const enforcedScopes = (): ReadonlyArray<ResourceServer.ScopeDescription> => [
    ...ResourceServer.scopeCatalog(Endpoints.Api),
    ...ResourceServer.scopeCatalog(Classic.Endpoints.Api),
    ...ResourceServer.scopeCatalog(PocketPlanes.Endpoints.Api),
    ...ResourceServer.scopeCatalog(PocketTrains.Endpoints.Api),
    ...ResourceServer.scopeCatalog(LegoTower.Endpoints.Api),
    ...ResourceServer.scopeCatalog(DiscoZoo.Endpoints.Api),
    ...ResourceServer.scopeCatalog(BitCity.Endpoints.Api),
    ...ResourceServer.scopeCatalog(TinyTowerVegas.Endpoints.Api),
];

/**
 * One scope as the dashboard presents it: what the api says about it, plus
 * whether this proxy lets a visitor grant it to themselves.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogNode extends ResourceServer.ScopeDescription {
    readonly selfServe: boolean;
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface CatalogBranch extends CatalogNode {
    readonly children: ReadonlyArray<CatalogNode>;
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface CatalogArea extends CatalogNode {
    readonly read: CatalogBranch;
    readonly write: CatalogBranch;
}

/**
 * A game: its own two branches, which span every area, and the areas.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogGame extends CatalogNode {
    readonly read: CatalogNode;
    readonly write: CatalogNode;
    readonly areas: ReadonlyArray<CatalogArea>;
}

const node = (source: ResourceServer.ScopeDescription, selfServe: boolean): CatalogNode => ({
    name: source.name,
    description: source.description,
    selfServe,
});

const branch = (source: Scopes.Branch, selfServe: boolean): CatalogBranch => ({
    ...node(source, selfServe),
    children: source.children.map((leaf) => node(leaf, selfServe)),
});

/**
 * The tree, in the order the api declares it, each node marked self-serve or
 * not. Served to the dashboard over the self-service api rather than imported
 * by it, so the browser bundle carries a tree of strings rather than the
 * endpoint definitions those strings were read from.
 *
 * @since 1.0.0
 * @category Catalog
 */
export const SCOPE_CATALOG: ReadonlyArray<CatalogGame> = GAMES.flatMap(({ games }) => games).map((game) => ({
    // A game, like an area, grants its writes too, so neither is self-serve.
    ...node(game, false),
    read: node(game.read, true),
    write: node(game.write, false),
    areas: Object.values(game.areas).map((area) => ({
        ...node(area, false),
        read: branch(area.read, true),
        write: branch(area.write, false),
    })),
}));

/**
 * Every scope a visitor may grant themselves: every `:read` node and the
 * leaves under them.
 *
 * @since 1.0.0
 * @category Policy
 */
export const SELF_SERVE_SCOPE_NAMES: ReadonlySet<string> = new Set(
    SCOPE_CATALOG.flatMap((game) => [
        game.read.name,
        ...game.areas.flatMap((area) => [area.read.name, ...area.read.children.map((leaf) => leaf.name)]),
    ])
);

/**
 * What the seeded public readonly key carries: one `:read` branch per game,
 * which grants every read leaf in every area without listing them.
 *
 * @since 1.0.0
 * @category Policy
 */
export const READONLY_KEY_SCOPES: ReadonlyArray<string> = SCOPE_CATALOG.map((game) => game.read.name);

// The tree and the endpoints must describe the same scopes. A leaf can only
// be made inside a game, so an endpoint cannot carry one the tree lacks;
// this is the other direction, a leaf the tree has that no endpoint carries.
{
    const declared = new Set(GAMES.flatMap(({ all }) => all()).map((scope) => scope.name));
    const enforced = new Set(enforcedScopes().map((scope) => scope.name));
    const unenforced = Array.from(declared).filter((name) => !enforced.has(name));
    const undeclared = Array.from(enforced).filter((name) => !declared.has(name));
    if (unenforced.length > 0 || undeclared.length > 0) {
        throw new Error(
            `[authproxy] scope tree and endpoints disagree: ` +
                `declared but on no endpoint [${unenforced.join(", ")}], ` +
                `on an endpoint but not declared [${undeclared.join(", ")}]`
        );
    }
}
