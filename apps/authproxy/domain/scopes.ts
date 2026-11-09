/**
 * The scopes this proxy hands out, read off the endpoints that enforce them.
 *
 * Every game has a scope for all of it, a `:read` and a `:write` scope, a
 * `:read` and a `:write` scope per area of its api, and a scope per endpoint.
 * Each endpoint accepts its own scope, its area's side, the game's side and
 * the game, and that annotation is all this module reads: an endpoint's scope
 * is listed under the area scope it names, and the area scope under the side
 * of the game it names. Nothing here names a scope on its own, so a scope
 * cannot be offered that no endpoint accepts.
 *
 * What is this proxy's own is the line between self-serve and elevated:
 * every `:read` scope and the endpoint scopes under it anyone signed in may
 * grant themselves; every `:write` scope and the scopes under it, and every
 * game (which includes its writes), is granted by hand. A line drawn on the
 * annotations rather than on a list of names cannot name a scope that does
 * not exist, and moves with the endpoints when a game or an endpoint is
 * added.
 *
 * The module also checks, when loaded, that every scoped endpoint accepts
 * exactly that, in that order: its own scope, one area scope on its side, one
 * of the game's `:read` and `:write`, and the game, all of them that game's,
 * with every scope in one place only. An endpoint that accepted both sides,
 * another game's scope, or a write under a `:read` area could let a
 * read-only key write, and the place to learn that is boot rather than a
 * request.
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
 * An area's `:read` or `:write` scope and the endpoint scopes under it.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogBranch extends CatalogNode {
    readonly children: ReadonlyArray<CatalogNode>;
}

/**
 * A game's `:read` or `:write` scope and the area scopes on that side.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogSide extends CatalogNode {
    readonly areas: ReadonlyArray<CatalogBranch>;
}

/**
 * A game: the scope for all of it, and its `:read` and `:write` sides.
 *
 * @since 1.0.0
 * @category Models
 */
export interface CatalogGame extends CatalogNode {
    readonly read: CatalogSide;
    readonly write: CatalogSide;
}

const node = (source: OAuthScope.Described, selfServe: boolean): CatalogNode => ({
    name: source.name,
    description: source.description,
    selfServe,
});

/** An area's side as it is collected: its scope and the endpoint scopes under it, by name. */
interface Collected {
    readonly scope: OAuthScope.Described;
    readonly leaves: Map<string, OAuthScope.Described>;
}

/**
 * One game's catalog, read off its api. Endpoints without a requirement are
 * skipped: the authorization layer guards those with the game's `:read` or
 * the whole game, which are listed anyway.
 *
 * Every requirement is read as exactly `[own, area side, game side, game]`,
 * narrowest first as `OAuthScope` asks, and anything else stops the boot.
 */
const catalogGame = <Id extends string, Groups extends HttpApiGroup.Constraint>(
    api: HttpApi.HttpApi<Id, Groups>,
    game: OAuthScope.Described,
    read: OAuthScope.Described,
    write: OAuthScope.Described
): CatalogGame => {
    const sides = { read: new Map<string, Collected>(), write: new Map<string, Collected>() };
    const placed = new Map<string, string>();
    const place = (name: string, where: string, endpoint: string) => {
        const before = placed.get(name);
        if (before !== undefined && before !== where) {
            throw new Error(
                `[authproxy] ${endpoint} puts ${name} under ${where}, but another endpoint under ${before}`
            );
        }
        placed.set(name, where);
    };

    HttpApi.reflect(api, {
        onGroup: () => {},
        onEndpoint: ({ group, endpoint, mergedAnnotations }) => {
            const requirement = Context.getOrUndefined(mergedAnnotations, OAuthScope.Required);
            if (requirement === undefined) return;

            const at = `${group.identifier}.${endpoint.identifier}`;
            const anyOf = requirement.anyOf ?? [];
            const [own, area, gameSide, whole] = anyOf.map((entry) => (typeof entry === "string" ? undefined : entry));
            // Another game's scope could be one that game lets anyone grant themselves.
            const ours = (scope: OAuthScope.Described | undefined): scope is OAuthScope.Described =>
                scope !== undefined &&
                scope.name.startsWith(`${game.name}:`) &&
                scope.name !== read.name &&
                scope.name !== write.name;
            if (
                requirement.allOf !== undefined ||
                anyOf.length !== 4 ||
                !ours(own) ||
                !ours(area) ||
                (gameSide?.name !== read.name && gameSide?.name !== write.name) ||
                whole?.name !== game.name
            ) {
                throw new Error(
                    `[authproxy] ${at} must accept exactly [its own scope, its area's side, ${read.name} or ` +
                        `${write.name}, ${game.name}], as described ${game.name} scopes`
                );
            }

            const side = gameSide?.name === read.name ? "read" : "write";
            // A write endpoint under a `:read` area would make that write self-serve.
            if (!area.name.endsWith(`:${side}`)) {
                throw new Error(`[authproxy] ${at} accepts ${area.name} on its ${side} side`);
            }
            place(area.name, `${side} areas`, at);
            place(own.name, area.name, at);

            const collected = sides[side].get(area.name) ?? { scope: area, leaves: new Map() };
            collected.leaves.set(own.name, own);
            sides[side].set(area.name, collected);
        },
    });

    const branches = (collected: Map<string, Collected>, selfServe: boolean) =>
        Array.from(collected.values(), ({ scope, leaves }) => ({
            ...node(scope, selfServe),
            children: Array.from(leaves.values(), (leaf) => node(leaf, selfServe)),
        }));

    return {
        // A game grants its writes too, so it is not self-serve.
        ...node(game, false),
        read: { ...node(read, true), areas: branches(sides.read, true) },
        write: { ...node(write, false), areas: branches(sides.write, false) },
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
 * Every scope a visitor may grant themselves: every game's `:read` scope, its
 * areas' `:read` scopes, and the endpoint scopes under those.
 *
 * @since 1.0.0
 * @category Policy
 */
export const SELF_SERVE_SCOPE_NAMES: ReadonlySet<string> = new Set(
    SCOPE_CATALOG.flatMap((game) => [
        game.read.name,
        ...game.read.areas.flatMap((area) => [area.name, ...area.children.map((leaf) => leaf.name)]),
    ])
);

/**
 * What the seeded public readonly key carries: one `:read` scope per game,
 * which every read endpoint accepts.
 *
 * @since 1.0.0
 * @category Policy
 */
export const READONLY_KEY_SCOPES: ReadonlyArray<string> = SCOPE_CATALOG.map((game) => game.read.name);
