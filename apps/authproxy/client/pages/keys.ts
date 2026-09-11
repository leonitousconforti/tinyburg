import { Duration, Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { KeysMessages, SharedMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { banner, card, dangerButton, primaryButton, quietButton, smallButton } from "@tinyburg/shared-ui/Chrome";
import { type Language, longDate } from "@tinyburg/shared-ui/Internationalization";
import { AsyncData, Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { evo } from "foldkit/struct";

import { ApiKey } from "../../domain/model.ts";
import { MAX_KEYS_PER_USER } from "../../shared/policy.ts";
import { type CatalogGame, type ScopeCatalogData, Self, type SessionInfo } from "../backend.ts";
import { descriptionsOf, scopePicker, toggleScope } from "../scopePicker.ts";

/**
 * One key as /self/keys lists it: the same API key model the proxy's
 * authorization middleware reads, minus nothing, because the key belongs to
 * the person looking at it.
 */
type Key = typeof ApiKey.json.Type;

// MODEL

// The model holds language-independent tags for what happened; the view
// supplies the words from the message catalog.
const KeysNotice = S.Literals(["copied", "created", "rotated", "revoked", "reEnabled", "deleted"]);
type KeysNotice = typeof KeysNotice.Type;
const KeysProblem = S.Literals(["actionFailed", "createRefused", "clipboardFailed"]);
type KeysProblem = typeof KeysProblem.Type;
const LoadFailed = S.Literals(["loadFailed"]);

export const Keys = AsyncData.Schema(S.Array(ApiKey.json), LoadFailed);

export const KeysModel = S.Struct({
    keys: Keys.schema,

    // The row currently mid-request, so only its own button says so. The
    // create form uses the sentinel "create".
    busy: S.Option(S.String),
    notice: S.Option(KeysNotice),
    problem: S.Option(KeysProblem),

    // Keys minted in this sitting. A key is shown in full the once, right
    // after it is created or rotated; every later look at it is masked.
    justMinted: S.Array(S.String),

    // Deleting takes two clicks: the first arms the button, the second acts.
    armedDelete: S.Option(S.String),

    form: S.Struct({
        open: S.Boolean,
        scopes: S.Array(S.String),
        description: S.String,
        // The game tab the scope picker is showing. Empty means the first.
        scopeTab: S.String,
    }),
});
export type KeysModel = typeof KeysModel.Type;

const closedForm = { open: false, scopes: [] as ReadonlyArray<string>, description: "", scopeTab: "" };

export const initialKeys: KeysModel = {
    keys: Keys.Idle(),
    busy: Option.none(),
    notice: Option.none(),
    problem: Option.none(),
    justMinted: [],
    armedDelete: Option.none(),
    form: closedForm,
};

/**
 * The keys page as entered: held data stays, transient row state clears.
 * Leaving and coming back counts as a later look, so nothing stays unmasked.
 */
export const enterKeys = (previous: KeysModel): KeysModel =>
    evo(previous, {
        busy: Option.none,
        notice: Option.none,
        problem: Option.none,
        justMinted: () => [],
        armedDelete: Option.none,
        form: () => closedForm,
    });

// MESSAGE

/**
 * Everything this page can say.
 *
 * `defineMessageUnion` declares the union and its constructors together, so a
 * variant cannot be added without joining the union or removed while something
 * still matches on it.
 */
export const KeysMessage = defineMessageUnion({
    SettledKeys: { result: S.Result(S.Array(ApiKey.json), LoadFailed) },

    ClickedOpenCreate: {},
    ClickedCancelCreate: {},
    ToggledScope: { scope: S.String },
    SelectedScopeTab: { game: S.String },
    ChangedDescription: { value: S.String },
    SubmittedCreate: {},
    CompletedCreate: { key: ApiKey.json },

    ClickedRotate: { key: S.String },
    CompletedRotate: { key: ApiKey.json },

    ClickedSetRevoked: { key: S.String, revoked: S.Boolean },
    CompletedSetRevoked: { key: ApiKey.json },

    ClickedDelete: { key: S.String },
    CompletedDelete: {},

    ClickedCopy: { key: S.String },
    CopiedKey: {},

    FailedAction: { problem: KeysProblem },
    /** The session ended somewhere else while this page was open. */
    SignedOutElsewhere: {},
});
export type KeysMessage = typeof KeysMessage.Type;

// COMMAND

export const FetchKeys = Command.define("FetchKeys", {
    messages: [KeysMessage.SettledKeys, KeysMessage.SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const keys = yield* self.SelfServiceGroup.listKeys();
        return KeysMessage.SettledKeys({ result: Result.succeed(keys) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(KeysMessage.SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(KeysMessage.SettledKeys({ result: Result.fail("loadFailed" as const) })))
    ),
});

const CreateKey = Command.define("CreateKey", {
    args: { scopes: S.Array(S.String), description: S.String },
    messages: [KeysMessage.CompletedCreate, KeysMessage.FailedAction, KeysMessage.SignedOutElsewhere],
    execute: ({ description, scopes }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const trimmed = description.trim();
            const key = yield* self.SelfServiceGroup.createKey({
                payload: {
                    scopes,
                    description: trimmed === "" ? Option.none() : Option.some(trimmed),
                },
            });
            return KeysMessage.CompletedCreate({ key });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(KeysMessage.SignedOutElsewhere())),
            Effect.catchTag("BadRequest", () => Effect.succeed(KeysMessage.FailedAction({ problem: "createRefused" }))),
            Effect.catch(() => Effect.succeed(KeysMessage.FailedAction({ problem: "actionFailed" })))
        ),
});

const RotateKey = Command.define("RotateKey", {
    args: { key: S.String },
    messages: [KeysMessage.CompletedRotate, KeysMessage.FailedAction, KeysMessage.SignedOutElsewhere],
    execute: ({ key }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const rotated = yield* self.SelfServiceGroup.rotateKey({ params: { key } });
            return KeysMessage.CompletedRotate({ key: rotated });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(KeysMessage.SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(KeysMessage.FailedAction({ problem: "actionFailed" })))
        ),
});

const SetRevoked = Command.define("SetRevoked", {
    args: { key: S.String, revoked: S.Boolean },
    messages: [KeysMessage.CompletedSetRevoked, KeysMessage.FailedAction, KeysMessage.SignedOutElsewhere],
    execute: ({ key, revoked }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const updated = yield* revoked
                ? self.SelfServiceGroup.revokeKey({ params: { key } })
                : self.SelfServiceGroup.enableKey({ params: { key } });
            return KeysMessage.CompletedSetRevoked({ key: updated });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(KeysMessage.SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(KeysMessage.FailedAction({ problem: "actionFailed" })))
        ),
});

const DeleteKey = Command.define("DeleteKey", {
    args: { key: S.String },
    messages: [KeysMessage.CompletedDelete, KeysMessage.FailedAction, KeysMessage.SignedOutElsewhere],
    execute: ({ key }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.SelfServiceGroup.deleteKey({ params: { key } });
            return KeysMessage.CompletedDelete();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(KeysMessage.SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(KeysMessage.FailedAction({ problem: "actionFailed" })))
        ),
});

const CopyKey = Command.define("CopyKey", {
    args: { key: S.String },
    messages: [KeysMessage.CopiedKey, KeysMessage.FailedAction],
    execute: ({ key }) =>
        Effect.tryPromise(() => navigator.clipboard.writeText(key)).pipe(
            Effect.as(KeysMessage.CopiedKey()),
            Effect.catch(() => Effect.succeed(KeysMessage.FailedAction({ problem: "clipboardFailed" })))
        ),
});

// UPDATE

type KeysStep = readonly [KeysModel, ReadonlyArray<Command.Command<KeysMessage, never, Self>>];

/** Starting an action clears whatever the last one had to say about itself. */
const starting = (model: KeysModel, busy: string): KeysModel =>
    evo(model, {
        busy: () => Option.some(busy),
        notice: Option.none,
        problem: Option.none,
        armedDelete: Option.none,
    });

const refetch = (model: KeysModel): KeysModel =>
    evo(model, { keys: (keys) => Option.getOrElse(AsyncData.revalidate(keys), () => keys) });

export const updateKeys = (model: KeysModel, message: KeysMessage, catalog: ReadonlyArray<CatalogGame>): KeysStep =>
    Match.value(message).pipe(
        Match.withReturnType<KeysStep>(),
        Match.tagsExhaustive({
            SettledKeys: ({ result }) => [evo(model, { keys: AsyncData.settle(result) }), []],

            ClickedOpenCreate: () => [
                evo(model, {
                    form: () => ({ ...closedForm, open: true }),
                    notice: Option.none,
                    problem: Option.none,
                    armedDelete: Option.none,
                }),
                [],
            ],
            ClickedCancelCreate: () => [evo(model, { form: () => closedForm }), []],
            ToggledScope: ({ scope }) => [
                evo(model, { form: (form) => evo(form, { scopes: (scopes) => toggleScope(scopes, scope, catalog) }) }),
                [],
            ],
            SelectedScopeTab: ({ game }) => [evo(model, { form: (form) => evo(form, { scopeTab: () => game }) }), []],
            ChangedDescription: ({ value }) => [
                evo(model, { form: (form) => evo(form, { description: () => value }) }),
                [],
            ],
            SubmittedCreate: () => [
                starting(model, "create"),
                [CreateKey({ scopes: model.form.scopes, description: model.form.description })],
            ],

            ClickedRotate: ({ key }) => [starting(model, key), [RotateKey({ key })]],
            ClickedSetRevoked: ({ key, revoked }) => [starting(model, key), [SetRevoked({ key, revoked })]],

            // The first click arms the delete; only a second click on the same
            // armed button sends the request.
            ClickedDelete: ({ key }) =>
                Option.contains(model.armedDelete, key)
                    ? [starting(model, key), [DeleteKey({ key })]]
                    : [evo(model, { armedDelete: () => Option.some(key), problem: Option.none }), []],

            ClickedCopy: ({ key }) => [model, [CopyKey({ key })]],
            CopiedKey: () => [evo(model, { notice: () => Option.some("copied" as const) }), []],

            // A fresh credential is the one moment the full key matters, so it
            // arrives unmasked. Every later look at the row is masked.
            CompletedCreate: ({ key }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    form: () => closedForm,
                    notice: () => Option.some("created" as const),
                    justMinted: (minted) => [...minted, key.key],
                }),
                [FetchKeys()],
            ],
            CompletedRotate: ({ key }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () => Option.some("rotated" as const),
                    justMinted: (minted) => [...minted, key.key],
                }),
                [FetchKeys()],
            ],
            CompletedSetRevoked: ({ key }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () => Option.some(key.revoked ? ("revoked" as const) : ("reEnabled" as const)),
                }),
                [FetchKeys()],
            ],
            CompletedDelete: () => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () => Option.some("deleted" as const),
                }),
                [FetchKeys()],
            ],

            FailedAction: ({ problem }) => [evo(model, { busy: Option.none, problem: () => Option.some(problem) }), []],

            SignedOutElsewhere: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

const maskKey = (key: string): string => `${key.slice(0, 8)}-····-····-····-············`;

const problemText = (msgs: KeysMessages, problem: KeysProblem): string =>
    problem === "createRefused" ? msgs.problems.createRefused(MAX_KEYS_PER_USER) : msgs.problems[problem];

/**
 * A scope a key holds, by name, with what it means on hover. A key may hold a
 * scope the catalog no longer lists - granted by hand, or renamed since - and
 * that still shows, as itself.
 */
const scopeChip = (h: HtmlBuilder<AppMessage>, descriptions: ReadonlyMap<string, string>, name: string): Html =>
    h.span(
        [
            h.Class("font-mono bg-sky-light/40 text-sky-dark rounded px-2 py-0.5 text-base"),
            h.Title(descriptions.get(name) ?? name),
        ],
        [name]
    );

const keyRow = (
    h: HtmlBuilder<AppMessage>,
    msgs: KeysMessages,
    shared: SharedMessages,
    language: Language,
    key: Key,
    model: KeysModel,
    descriptions: ReadonlyMap<string, string>
): Html => {
    const busy = Option.contains(model.busy, key.key);
    const minted = model.justMinted.includes(key.key);
    const armed = Option.contains(model.armedDelete, key.key);

    return h.keyed("div")(
        `${key.id}`,
        [
            h.Class(
                key.revoked
                    ? "flex flex-col gap-3 rounded-lg border-2 border-red-200 bg-red-50/60 p-4"
                    : "flex flex-col gap-3 rounded-lg border-2 border-gray-300 bg-white p-4"
            ),
        ],
        [
            h.div(
                [h.Class("flex flex-wrap items-center gap-2")],
                [
                    h.code(
                        [h.Class("font-code min-w-0 flex-1 text-lg break-all text-gray-800")],
                        [minted ? key.key : maskKey(key.key)]
                    ),
                    key.revoked
                        ? h.span(
                              [h.Class("font-pixel rounded bg-red-700 px-2 py-1 text-[0.5rem] text-white")],
                              [shared.revokedBadge]
                          )
                        : h.empty,
                ]
            ),
            ...Option.match(key.description, {
                onSome: (description) => [h.p([h.Class("font-mono text-lg text-gray-600")], [description])],
                onNone: () => [],
            }),
            h.div(
                [h.Class("flex flex-wrap gap-1.5")],
                Array.from(key.scopes, (scope) => scopeChip(h, descriptions, scope))
            ),
            h.p(
                [h.Class("font-mono text-base text-gray-500")],
                [
                    `${msgs.createdLastUsed(longDate(language, key.createdAt), longDate(language, key.lastUsedAt))} · ` +
                        shared.rateLimit(key.rateLimitLimit, Math.round(Duration.toSeconds(key.rateLimitWindow))),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [h.Type("button"), h.Class(smallButton), h.OnClick(KeysMessage.ClickedCopy({ key: key.key }))],
                        [msgs.copy]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.Title(msgs.rotateTitle),
                            h.OnClick(KeysMessage.ClickedRotate({ key: key.key })),
                        ],
                        [busy ? "..." : msgs.rotate]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.OnClick(KeysMessage.ClickedSetRevoked({ key: key.key, revoked: !key.revoked })),
                        ],
                        [busy ? "..." : key.revoked ? shared.reEnable : shared.revoke]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(dangerButton),
                            h.Disabled(busy),
                            h.OnClick(KeysMessage.ClickedDelete({ key: key.key })),
                        ],
                        [busy ? "..." : armed ? shared.reallyDelete : shared.delete]
                    ),
                ]
            ),
        ]
    );
};

const createForm = (
    h: HtmlBuilder<AppMessage>,
    msgs: KeysMessages,
    shared: SharedMessages,
    model: KeysModel,
    catalog: ReadonlyArray<CatalogGame>
): Html => {
    const creating = Option.contains(model.busy, "create");

    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.label(
                [h.Class("flex flex-col gap-1")],
                [
                    h.span([h.Class("font-pixel text-[0.55rem] text-gray-600")], [msgs.descriptionLabel]),
                    h.input([
                        h.Type("text"),
                        h.Class(
                            "font-mono focus:border-sky-blue rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xl outline-none"
                        ),
                        h.Placeholder(msgs.descriptionPlaceholder),
                        h.Value(model.form.description),
                        h.OnInput((value) => KeysMessage.ChangedDescription({ value })),
                    ]),
                ]
            ),
            h.p([h.Class("font-pixel text-[0.55rem] text-gray-600")], [msgs.readOnlyScopesLabel]),
            // The whole tree, with only the reads on offer: the writes are
            // listed dimmed so a visitor can see what they would have to ask
            // for, and the note below says where.
            scopePicker(h, {
                catalog,
                selected: model.form.scopes,
                onToggle: (scope) => KeysMessage.ToggledScope({ scope }),
                selectable: (node) => node.selfServe,
                activeGame: model.form.scopeTab,
                onSelectGame: (game) => KeysMessage.SelectedScopeTab({ game }),
            }),
            h.p([h.Class("font-pixel text-[0.55rem] text-gray-600")], [msgs.writeScopesNote]),
            h.div(
                [h.Class("flex flex-wrap gap-3")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(primaryButton),
                            h.Disabled(model.form.scopes.length === 0 || creating),
                            h.OnClick(KeysMessage.SubmittedCreate()),
                        ],
                        [creating ? "..." : msgs.createKey]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(quietButton),
                            h.Disabled(creating),
                            h.OnClick(KeysMessage.ClickedCancelCreate()),
                        ],
                        [shared.cancel]
                    ),
                ]
            ),
        ]
    );
};

const keysSection = (
    h: HtmlBuilder<AppMessage>,
    msgs: KeysMessages,
    shared: SharedMessages,
    language: Language,
    model: KeysModel,
    catalog: ReadonlyArray<CatalogGame>
): Html => {
    const descriptions = descriptionsOf(catalog);
    const list = (keys: ReadonlyArray<Key>): Html =>
        h.div(
            [h.Class("flex flex-col gap-4")],
            [
                ...(keys.length === 0
                    ? [h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.emptyState])]
                    : keys.map((key) => keyRow(h, msgs, shared, language, key, model, descriptions))),
                model.form.open
                    ? createForm(h, msgs, shared, model, catalog)
                    : h.div(
                          [],
                          [
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Class(primaryButton),
                                      h.Disabled(keys.length >= MAX_KEYS_PER_USER),
                                      h.Title(
                                          keys.length >= MAX_KEYS_PER_USER
                                              ? msgs.maxKeysTitle(MAX_KEYS_PER_USER)
                                              : msgs.provisionTitle
                                      ),
                                      h.OnClick(KeysMessage.ClickedOpenCreate()),
                                  ],
                                  [msgs.newKey]
                              ),
                          ]
                      ),
            ]
        );

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.sectionHeading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.sectionIntro]),
            AsyncData.match(model.keys, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onFailure: () => h.p([h.Class("font-mono text-xl text-red-700")], [msgs.loadFailed]),
                onRefreshing: list,
                onStale: ({ data }) => list(data),
                onSuccess: list,
            }),
        ]
    );
};

export const keysView = (
    h: HtmlBuilder<AppMessage>,
    msgs: KeysMessages,
    shared: SharedMessages,
    language: Language,
    model: KeysModel,
    session: SessionInfo,
    scopes: ScopeCatalogData
): Html => {
    // Until the catalog lands - or if it never does - chips show bare names
    // and the create form offers nothing to tick, which is the honest state.
    const catalog = Option.getOrElse(AsyncData.getData(scopes), (): ReadonlyArray<CatalogGame> => []);

    return h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            h.div(
                [h.Class("flex w-full max-w-3xl flex-col gap-6")],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center justify-between gap-3")],
                        [
                            h.h1(
                                [h.Class("font-pixel text-dark-blue text-lg")],
                                [
                                    Option.match(session.displayName, {
                                        onSome: (name) => msgs.headingFor(name),
                                        onNone: () => msgs.heading,
                                    }),
                                ]
                            ),
                            h.form(
                                [h.Method("post"), h.Action("/logout")],
                                [h.button([h.Type("submit"), h.Class(quietButton)], [msgs.signOut])]
                            ),
                        ]
                    ),
                    ...Option.match(model.notice, {
                        onSome: (notice) => [banner(h, "notice", msgs.notices[notice])],
                        onNone: () => [],
                    }),
                    ...Option.match(model.problem, {
                        onSome: (problem) => [banner(h, "problem", problemText(msgs, problem))],
                        onNone: () => [],
                    }),
                    keysSection(h, msgs, shared, language, model, catalog),
                ]
            ),
        ]
    );
};
