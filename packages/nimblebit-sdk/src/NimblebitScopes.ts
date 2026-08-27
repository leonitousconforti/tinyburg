/**
 * The scope tree every Nimblebit game's api is guarded by.
 *
 * A game sits at the top and splits into a `:read` and a `:write` branch that
 * span the whole game. Beneath it, each area of the api (`sync`, `social`,
 * ...) splits into a `:read` and a `:write` branch of its own, with a leaf
 * per endpoint under those. A scope grants everything beneath it, so
 * `<game>:read` grants every read in the game, `<game>:sync:read` every
 * read in one area, and `<game>:sync:pull_save` one endpoint. That reaches
 * enforcement without any prefix matching: a leaf carries the list an
 * endpoint accepts - itself, its area's branch, its area, the game's branch,
 * the game - and a key holding any one of them matches by plain equality.
 *
 * A leaf exists only as part of an area, and an area only as part of a game,
 * both made by {@link defineGame} from the spec that names them, so nothing
 * can be outside the tree and no name can disagree with its place in it.
 * `Sync.read.pull_save` is the leaf named `<game>:sync:pull_save`, and
 * `Sync.read.pull_save.grants` is what goes on the endpoint. {@link defineArea}
 * makes a standalone area for an api whose scopes need no game above them.
 *
 * This lives here rather than in one game's sdk because every game builds the
 * same shape: a sdk that only needs to declare its scopes should not have to
 * depend on TinyTower to do it.
 *
 * `import type` keeps this module free of runtime imports.
 *
 * @since 1.0.0
 * @category Scopes
 */

import type * as ResourceServer from "effect-oidc/ResourceServer";

/**
 * A scope on one endpoint, and the scopes that grant it. `grants` is the
 * endpoint's `OIDCScopes` annotation.
 *
 * Exported, along with {@link Branch}, {@link Area} and {@link Game}, because a
 * package that builds its own tree has to be able to name the type of what it
 * exports.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Leaf extends ResourceServer.ScopeDescription {
    readonly grants: ReadonlyArray<ResourceServer.ScopeDescription>;
}

/**
 * A `:read` or `:write` branch: a scope that grants every leaf under it.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Branch extends ResourceServer.ScopeDescription {
    readonly children: ReadonlyArray<Leaf>;
}

/**
 * One area of an api: a scope that grants both of its branches.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Area extends ResourceServer.ScopeDescription {
    readonly read: Branch;
    readonly write: Branch;
}

/**
 * One game: a scope that grants every area, with a `:read` and a `:write`
 * branch that each span every area.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Game extends ResourceServer.ScopeDescription {
    readonly read: Branch;
    readonly write: Branch;
    readonly areas: Readonly<Record<string, Area>>;
}

/** The leaves of a branch, reachable by key: `Sync.read.pull_save`. */
type Keyed<K extends string> = { readonly [P in K]: Leaf };

/** A key a leaf may not have, because the branch already has that field. */
type Reserved = "name" | "description" | "children";

/** An area with its leaves reachable by key. */
type KeyedArea<R extends string, W extends string> = Area & {
    readonly read: Branch & Keyed<R>;
    readonly write: Branch & Keyed<W>;
};

/**
 * A branch as it is written: its description and, keyed by the leaf name
 * (the part after the area), each leaf's description.
 */
interface BranchSpec<K extends string> {
    readonly description: string;
    readonly leaves: Readonly<Record<K, string>>;
}

/** An area as it is written inside a game, which names it by its key. */
interface AreaSpec<R extends string, W extends string> {
    readonly description: string;
    readonly read: BranchSpec<R>;
    readonly write: BranchSpec<W>;
}

/** Refuses a leaf keyed like one of the branch's own fields. */
type NoReservedLeaves<R extends string, W extends string> = [(R | W) & Reserved] extends [never]
    ? unknown
    : "a leaf may not be keyed name, description or children";

/** What sits above an area: the prefix its name carries, and what its leaves grant beyond it. */
interface Above {
    readonly prefix: string;
    readonly read: ReadonlyArray<ResourceServer.ScopeDescription>;
    readonly write: ReadonlyArray<ResourceServer.ScopeDescription>;
}

const makeArea = <R extends string, W extends string>(
    name: string,
    spec: AreaSpec<R, W>,
    above?: Above
): KeyedArea<R, W> => {
    const area: ResourceServer.ScopeDescription = {
        name: above === undefined ? name : `${above.prefix}:${name}`,
        description: spec.description,
    };

    const branch = <K extends string>(
        kind: "read" | "write",
        branchSpec: BranchSpec<K>,
        grantsAbove: ReadonlyArray<ResourceServer.ScopeDescription>
    ): Branch & Keyed<K> => {
        const scope: ResourceServer.ScopeDescription = {
            name: `${area.name}:${kind}`,
            description: branchSpec.description,
        };
        const leaves = Object.entries<string>(branchSpec.leaves).map(([key, description]): readonly [string, Leaf] => {
            const leaf: ResourceServer.ScopeDescription = { name: `${area.name}:${key}`, description };
            return [key, { ...leaf, grants: [leaf, scope, area, ...grantsAbove] }];
        });
        // `fromEntries` gives an index signature; the keys are exactly K by
        // construction, which is what the return type says.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const keyed = Object.fromEntries(leaves) as Keyed<K>;
        return { ...keyed, ...scope, children: leaves.map(([, leaf]) => leaf) };
    };

    return {
        ...area,
        read: branch("read", spec.read, above?.read ?? []),
        write: branch("write", spec.write, above?.write ?? []),
    };
};

/**
 * Makes a standalone area, its two branches and their leaves from one
 * literal. Names are derived from the path - the area's name, `:read` or
 * `:write`, and the leaf's key - so a leaf's name says where it sits and
 * nothing has to be written twice.
 *
 * For an api whose scopes need no game above them. Inside a game, areas are
 * written as part of {@link defineGame} instead.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const defineArea = <R extends string, W extends string>(
    spec: { readonly name: string } & AreaSpec<R, W> & NoReservedLeaves<R, W>
): KeyedArea<R, W> => makeArea(spec.name, spec);

/**
 * Makes a game, its `:read` and `:write` branches, and every area beneath it
 * from one literal. Areas are keyed by name and prefixed with the game's, so
 * `sync` inside `tinytower` is `tinytower:sync` and its leaves
 * `tinytower:sync:<key>`; the game's own branches gather every read and every
 * write across its areas.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const defineGame = <const Areas extends Readonly<Record<string, AreaSpec<string, string>>>>(spec: {
    readonly name: string;
    readonly description: string;
    readonly read: { readonly description: string };
    readonly write: { readonly description: string };
    readonly areas: Areas & {
        readonly [K in keyof Areas]: Areas[K] extends AreaSpec<infer R, infer W> ? NoReservedLeaves<R, W> : never;
    };
}): Game & {
    readonly areas: {
        readonly [K in keyof Areas]: Areas[K] extends AreaSpec<infer R, infer W> ? KeyedArea<R, W> : never;
    };
} => {
    const game: ResourceServer.ScopeDescription = { name: spec.name, description: spec.description };
    const read: ResourceServer.ScopeDescription = { name: `${spec.name}:read`, description: spec.read.description };
    const write: ResourceServer.ScopeDescription = { name: `${spec.name}:write`, description: spec.write.description };

    const above: Above = { prefix: spec.name, read: [read, game], write: [write, game] };
    const entries = Object.entries<AreaSpec<string, string>>(spec.areas).map(
        ([key, areaSpec]): readonly [string, KeyedArea<string, string>] => [key, makeArea(key, areaSpec, above)]
    );
    // As in makeArea: the keys are exactly those of the spec.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const areas = Object.fromEntries(entries) as {
        readonly [K in keyof Areas]: Areas[K] extends AreaSpec<infer R, infer W> ? KeyedArea<R, W> : never;
    };
    const list = entries.map(([, area]) => area);

    return {
        ...game,
        read: { ...read, children: list.flatMap((area) => area.read.children) },
        write: { ...write, children: list.flatMap((area) => area.write.children) },
        areas,
    };
};
