/**
 * The scopes this proxy hands out, read off the endpoints that enforce them.
 *
 * Every game has a scope for all of it, a `:read` and a `:write` scope, and a
 * scope per endpoint. Each endpoint accepts its own scope, its side's and the
 * game's, and that annotation is all this module reads: an endpoint's scope
 * is listed under `:read` when the endpoint accepts the game's `:read`, and
 * under `:write` when it accepts the game's `:write`. Nothing here names a
 * scope on its own, so a scope cannot be offered that no endpoint accepts.
 *
 * What is this proxy's own is the line between self-serve and elevated:
 * every game's `:read` scope and the endpoint scopes under it anyone signed
 * in may grant themselves; every `:write` scope and the scopes under it, and
 * every game (which includes its writes), is granted by hand. A line drawn on
 * the annotations rather than on a list of names cannot name a scope that
 * does not exist, and moves with the endpoints when a game or an endpoint is
 * added.
 *
 * The module also checks, when loaded, that every scoped endpoint accepts its
 * game and exactly one of the game's `:read` and `:write` scopes. An endpoint
 * that accepted both would let a read-only key write, and one that accepted
 * neither would have no side to list its scope under, and the place to learn
 * either is boot rather than a request.
 *
 * @since 1.0.0
 */

import { Context } from "effect";
import { HttpApi, type HttpApiGroup } from "effect/http-api";

import * as BitCity from "@tinyburg/bitcity-sdk";
import * as DiscoZoo from "@tinyburg/disco-zoo-sdk";
import * as LegoTower from "@tinyburg/lego-tower-sdk";
import * as PocketPlanes from "@tinyburg/pocket-planes-sdk";
import * as PocketTrains from "@tinyburg/pocket-trains-sdk";
import * as Classic from "@tinyburg/tinytower-classic-sdk";
import { Endpoints, Scopes } from "@tinyburg/tinytower-sdk";
import * as TinyTowerVegas from "@tinyburg/tinytower-vegas-sdk";
import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * One scope as the dashboard presents it: what the api says about it, plus
 * whether this proxy lets a visitor grant it to themselves.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogNode extends OAuthScope.Described {
    readonly selfServe: boolean;
}

/**
 * A game's `:read` or `:write` scope and the endpoint scopes under it.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogBranch extends CatalogNode {
    readonly children: ReadonlyArray<CatalogNode>;
}

/**
 * A game: the scope for all of it, and its `:read` and `:write` scopes.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogGame extends CatalogNode {
    readonly read: CatalogBranch;
    readonly write: CatalogBranch;
}

const node = (source: OAuthScope.Described, selfServe: boolean): CatalogNode => ({
    name: source.name,
    description: source.description,
    selfServe,
});

/**
 * One game's catalog, read off its api. Endpoints without a requirement are
 * skipped: the authorization layer guards those with the game's `:read` or
 * the whole game, which are listed anyway.
 */
const catalogGame = <Id extends string, Groups extends HttpApiGroup.Constraint>(
    api: HttpApi.HttpApi<Id, Groups>,
    game: OAuthScope.Described,
    read: OAuthScope.Described,
    write: OAuthScope.Described
): CatalogGame => {
    const reads = new Map<string, OAuthScope.Described>();
    const writes = new Map<string, OAuthScope.Described>();

    HttpApi.reflect(api, {
        onGroup: () => {},
        onEndpoint: ({ group, endpoint, mergedAnnotations }) => {
            const requirement = Context.getOrUndefined(mergedAnnotations, OAuthScope.Required);
            if (requirement === undefined) return;

            const entries = [...(requirement.allOf ?? []), ...(requirement.anyOf ?? [])];
            const names = new Set(entries.map((entry) => (typeof entry === "string" ? entry : entry.name)));
            if (!names.has(game.name) || names.has(read.name) === names.has(write.name)) {
                throw new Error(
                    `[authproxy] ${group.identifier}.${endpoint.name} must accept ${game.name} and exactly one of ` +
                        `${read.name} and ${write.name}`
                );
            }

            const side = names.has(read.name) ? reads : writes;
            for (const entry of entries) {
                if (typeof entry === "string") {
                    throw new Error(`[authproxy] ${group.identifier}.${endpoint.name} accepts ${entry} undescribed`);
                }
                if (entry.name !== game.name && entry.name !== read.name && entry.name !== write.name) {
                    side.set(entry.name, entry);
                }
            }
        },
    });

    // A scope some write endpoint accepts is a write, wherever else it appears.
    for (const name of writes.keys()) reads.delete(name);

    return {
        // A game grants its writes too, so it is not self-serve.
        ...node(game, false),
        read: { ...node(read, true), children: Array.from(reads.values(), (leaf) => node(leaf, true)) },
        write: { ...node(write, false), children: Array.from(writes.values(), (leaf) => node(leaf, false)) },
    };
};

/**
 * Every game this proxy serves, in the order the dashboard lists them, each
 * scope marked self-serve or not. Served to the dashboard over the
 * self-service api rather than imported by it, so the browser bundle carries
 * a list of strings rather than the endpoint definitions those strings were
 * read from. Adding a game is one line here plus its routes in `index.ts`.
 *
 * @since 1.0.0
 * @category Catalog
 */
export const SCOPE_CATALOG: ReadonlyArray<CatalogGame> = [
    catalogGame(Endpoints.Api, Scopes.TinyTower, Scopes.Read, Scopes.Write),
    catalogGame(Classic.Endpoints.Api, Classic.Scopes.TinyTowerClassic, Classic.Scopes.Read, Classic.Scopes.Write),
    catalogGame(
        PocketPlanes.Endpoints.Api,
        PocketPlanes.Scopes.PocketPlanes,
        PocketPlanes.Scopes.Read,
        PocketPlanes.Scopes.Write
    ),
    catalogGame(
        PocketTrains.Endpoints.Api,
        PocketTrains.Scopes.PocketTrains,
        PocketTrains.Scopes.Read,
        PocketTrains.Scopes.Write
    ),
    catalogGame(LegoTower.Endpoints.Api, LegoTower.Scopes.LEGOTower, LegoTower.Scopes.Read, LegoTower.Scopes.Write),
    catalogGame(DiscoZoo.Endpoints.Api, DiscoZoo.Scopes.DiscoZoo, DiscoZoo.Scopes.Read, DiscoZoo.Scopes.Write),
    catalogGame(BitCity.Endpoints.Api, BitCity.Scopes.BitCity, BitCity.Scopes.Read, BitCity.Scopes.Write),
    catalogGame(
        TinyTowerVegas.Endpoints.Api,
        TinyTowerVegas.Scopes.TinyTowerVegas,
        TinyTowerVegas.Scopes.Read,
        TinyTowerVegas.Scopes.Write
    ),
];

/**
 * Every scope a visitor may grant themselves: every game's `:read` scope and
 * the endpoint scopes under it.
 *
 * @since 1.0.0
 * @category Policy
 */
export const SELF_SERVE_SCOPE_NAMES: ReadonlySet<string> = new Set(
    SCOPE_CATALOG.flatMap((game) => [game.read.name, ...game.read.children.map((leaf) => leaf.name)])
);

/**
 * What the seeded public readonly key carries: one `:read` scope per game,
 * which every read endpoint accepts.
 *
 * @since 1.0.0
 * @category Policy
 */
export const READONLY_KEY_SCOPES: ReadonlyArray<string> = SCOPE_CATALOG.map((game) => game.read.name);
