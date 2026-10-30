/**
 * The scope tree every Nimblebit game's api is guarded by.
 *
 * @since 1.0.0
 * @category Scopes
 */

import type * as Arr from "effect/Array";

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * A scope by name, with the text a player reads for it on the consent
 * screen.
 *
 * @since 1.0.0
 * @category Models
 */
export type ScopeDescription = OAuthScope.Described;

/**
 * One endpoint's scope. `grants` is the leaf and every scope above it,
 * narrowest first, and `required` is the requirement an endpoint is
 * annotated with: any one of `grants`.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Leaf extends ScopeDescription {
    readonly grants: Arr.NonEmptyReadonlyArray<ScopeDescription>;
    readonly required: OAuthScope.Requirement;
}

/**
 * A `:read` or `:write` branch: a scope that grants every leaf under it.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Branch extends ScopeDescription {
    readonly children: ReadonlyArray<Leaf>;
}

/**
 * One area of an api: a scope that grants both of its branches.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Area extends ScopeDescription {
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
export interface Game extends ScopeDescription {
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
    readonly read: ReadonlyArray<ScopeDescription>;
    readonly write: ReadonlyArray<ScopeDescription>;
}

const makeArea = <R extends string, W extends string>(
    name: string,
    spec: AreaSpec<R, W>,
    above?: Above
): KeyedArea<R, W> => {
    const area: ScopeDescription = {
        name: OAuthScope.make(above === undefined ? name : `${above.prefix}:${name}`),
        description: spec.description,
    };

    const branch = <K extends string>(
        kind: "read" | "write",
        branchSpec: BranchSpec<K>,
        grantsAbove: ReadonlyArray<ScopeDescription>
    ): Branch & Keyed<K> => {
        const scope: ScopeDescription = {
            name: OAuthScope.make(`${area.name}:${kind}`),
            description: branchSpec.description,
        };

        const leaves = Object.entries<string>(branchSpec.leaves).map(([key, description]): readonly [string, Leaf] => {
            const leaf: ScopeDescription = { name: OAuthScope.make(`${area.name}:${key}`), description };
            const grants: Arr.NonEmptyReadonlyArray<ScopeDescription> = [leaf, scope, area, ...grantsAbove];
            return [key, { ...leaf, grants, required: { anyOf: grants } }];
        });

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
    const game: ScopeDescription = { name: OAuthScope.make(spec.name), description: spec.description };
    const read: ScopeDescription = { name: OAuthScope.make(`${spec.name}:read`), description: spec.read.description };
    const write: ScopeDescription = {
        name: OAuthScope.make(`${spec.name}:write`),
        description: spec.write.description,
    };

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

/**
 * The requirement that accepts exactly one scope: what a group is annotated
 * with when nothing narrower than the whole node will do.
 *
 * @since 1.0.0
 * @category Requirements
 */
export const requiredBy = (node: ScopeDescription): OAuthScope.Requirement => ({
    anyOf: [{ name: node.name, description: node.description }],
});

/**
 * The scope name of a requirement entry, which is either a bare scope or a
 * described one.
 *
 * @since 1.0.0
 * @category Requirements
 */
export const entryName = (entry: OAuthScope.OAuthScope | OAuthScope.Described): string =>
    typeof entry === "string" ? entry : entry.name;

/**
 * Whether holding `held` satisfies `requirement`, by name, exactly as the
 * Tinyburg OAuth server checks a token: every `allOf` scope held and, when
 * `anyOf` is present, at least one of those. A requirement with neither, or
 * with an empty `anyOf`, is satisfied by nothing, because the server refuses
 * it too; `{ allOf: [] }` is satisfied by anything.
 *
 * @since 1.0.0
 * @category Requirements
 */
export const isSatisfied = (requirement: OAuthScope.Requirement, held: ReadonlySet<string>): boolean => {
    const holds = (entry: OAuthScope.OAuthScope | OAuthScope.Described) => held.has(entryName(entry));
    return (
        (requirement.allOf !== undefined || requirement.anyOf !== undefined) &&
        (requirement.allOf ?? []).every(holds) &&
        (requirement.anyOf === undefined || requirement.anyOf.some(holds))
    );
};
