import { Duration, Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { AdminMessages, SharedMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { banner, card, dangerButton, primaryButton, quietButton, smallButton } from "@tinyburg/shared-ui/Chrome";
import { AsyncData, Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { evo } from "foldkit/struct";

import { ApiKey } from "../../domain/model.ts";
import { type CatalogGame, type ScopeCatalogData, Self } from "../backend.ts";
import { descriptionsOf, scopePicker, toggleScope } from "../scopePicker.ts";

type Key = typeof ApiKey.json.Type;

// MODEL

// The model holds language-independent tags for what happened; the view
// supplies the words from the message catalog.
const AdminNotice = S.Literals(["saved", "keyDeleted"]);
const AdminProblem = S.Literals(["elevationFailed", "actionFailed", "rateLimitInvalid"]);
const LoadFailed = S.Literals(["loadFailed"]);

export const AdminKeys = AsyncData.Schema(S.Array(ApiKey.json), LoadFailed);

const ScopesEditor = S.Struct({ key: S.String, scopes: S.Array(S.String), scopeTab: S.String });
const RateLimitEditor = S.Struct({ key: S.String, limit: S.String, windowSeconds: S.String });

export const AdminModel = S.Struct({
    keys: AdminKeys.schema,

    // The admin surface answered Forbidden: the session needs the step-up.
    needsElevation: S.Boolean,

    busy: S.Option(S.String),
    notice: S.Option(AdminNotice),
    problem: S.Option(AdminProblem),
    armedDelete: S.Option(S.String),

    // At most one row is being edited at a time.
    scopesEditor: S.Option(ScopesEditor),
    rateLimitEditor: S.Option(RateLimitEditor),
});
export type AdminModel = typeof AdminModel.Type;

export const initialAdmin: AdminModel = {
    keys: AdminKeys.Idle(),
    needsElevation: false,
    busy: Option.none(),
    notice: Option.none(),
    problem: Option.none(),
    armedDelete: Option.none(),
    scopesEditor: Option.none(),
    rateLimitEditor: Option.none(),
};

/**
 * The admin page as entered: held data stays, transient state clears. The
 * elevation round trip lands back here with its outcome in the url, so the
 * page opens saying how it went.
 */
export const enterAdmin = (error: Option.Option<string>, previous: AdminModel): AdminModel =>
    evo(previous, {
        busy: Option.none,
        notice: Option.none,
        problem: () => Option.map(error, () => "elevationFailed" as const),
        armedDelete: Option.none,
        scopesEditor: Option.none,
        rateLimitEditor: Option.none,
    });

// MESSAGE

/**
 * Everything this page can say.
 *
 * `defineMessageUnion` declares the union and its constructors together, so a
 * variant cannot be added without joining the union or removed while something
 * still matches on it.
 */
export const AdminMessage = defineMessageUnion({
    SettledAdminKeys: { result: S.Result(S.Array(ApiKey.json), LoadFailed) },
    /** The admin surface refused a plain session; show the step-up form. */
    AdminRequiresElevation: {},

    ClickedEditScopes: { key: S.String },
    ToggledAdminScope: { scope: S.String },
    SelectedAdminScopeTab: { game: S.String },
    ClickedEditRateLimit: { key: S.String },
    ChangedAdminLimit: { value: S.String },
    ChangedAdminWindow: { value: S.String },
    ClickedCancelAdminEdit: {},
    SubmittedAdminEdit: {},

    ClickedAdminSetRevoked: { key: S.String, revoked: S.Boolean },
    ClickedAdminDelete: { key: S.String },
    CompletedAdminRowUpdate: {},
    CompletedAdminDelete: {},
    FailedAdminAction: { problem: AdminProblem },
    /** The session ended somewhere else while this page was open. */
    AdminSignedOutElsewhere: {},
});
export type AdminMessage = typeof AdminMessage.Type;

// COMMAND

export const FetchAdminKeys = Command.define("FetchAdminKeys", {
    messages: [
        AdminMessage.SettledAdminKeys,
        AdminMessage.AdminRequiresElevation,
        AdminMessage.AdminSignedOutElsewhere,
    ],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const keys = yield* self.AdminGroup.listKeys();
        return AdminMessage.SettledAdminKeys({ result: Result.succeed(keys) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(AdminMessage.AdminSignedOutElsewhere())),
        Effect.catchTag("Forbidden", () => Effect.succeed(AdminMessage.AdminRequiresElevation())),
        Effect.catch(() =>
            Effect.succeed(AdminMessage.SettledAdminKeys({ result: Result.fail("loadFailed" as const) }))
        )
    ),
});

const SaveScopes = Command.define("SaveScopes", {
    args: { key: S.String, scopes: S.Array(S.String) },
    messages: [
        AdminMessage.CompletedAdminRowUpdate,
        AdminMessage.FailedAdminAction,
        AdminMessage.AdminRequiresElevation,
        AdminMessage.AdminSignedOutElsewhere,
    ],
    execute: ({ key, scopes }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.AdminGroup.scopes({ params: { key }, payload: { scopes } });
            return AdminMessage.CompletedAdminRowUpdate();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminMessage.AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminMessage.AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(AdminMessage.FailedAdminAction({ problem: "actionFailed" })))
        ),
});

const SaveRateLimit = Command.define("SaveRateLimit", {
    args: { key: S.String, limit: S.Int, windowSeconds: S.Int },
    messages: [
        AdminMessage.CompletedAdminRowUpdate,
        AdminMessage.FailedAdminAction,
        AdminMessage.AdminRequiresElevation,
        AdminMessage.AdminSignedOutElsewhere,
    ],
    execute: ({ key, limit, windowSeconds }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.AdminGroup.rateLimit({
                params: { key },
                payload: { limit, window: Duration.seconds(windowSeconds) },
            });
            return AdminMessage.CompletedAdminRowUpdate();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminMessage.AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminMessage.AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(AdminMessage.FailedAdminAction({ problem: "actionFailed" })))
        ),
});

const SetRevokedAdmin = Command.define("SetRevokedAdmin", {
    args: { key: S.String, revoked: S.Boolean },
    messages: [
        AdminMessage.CompletedAdminRowUpdate,
        AdminMessage.FailedAdminAction,
        AdminMessage.AdminRequiresElevation,
        AdminMessage.AdminSignedOutElsewhere,
    ],
    execute: ({ key, revoked }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* revoked ? self.AdminGroup.revoke({ params: { key } }) : self.AdminGroup.enable({ params: { key } });
            return AdminMessage.CompletedAdminRowUpdate();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminMessage.AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminMessage.AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(AdminMessage.FailedAdminAction({ problem: "actionFailed" })))
        ),
});

const DeleteKeyAdmin = Command.define("DeleteKeyAdmin", {
    args: { key: S.String },
    messages: [
        AdminMessage.CompletedAdminDelete,
        AdminMessage.FailedAdminAction,
        AdminMessage.AdminRequiresElevation,
        AdminMessage.AdminSignedOutElsewhere,
    ],
    execute: ({ key }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.AdminGroup.deleteKey({ params: { key } });
            return AdminMessage.CompletedAdminDelete();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminMessage.AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminMessage.AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(AdminMessage.FailedAdminAction({ problem: "actionFailed" })))
        ),
});

// UPDATE

type AdminStep = readonly [AdminModel, ReadonlyArray<Command.Command<AdminMessage, never, Self>>];

const starting = (model: AdminModel, busy: string): AdminModel =>
    evo(model, {
        busy: () => Option.some(busy),
        notice: Option.none,
        problem: Option.none,
        armedDelete: Option.none,
    });

const refetching = (model: AdminModel): AdminModel =>
    evo(model, { keys: (keys) => Option.getOrElse(AsyncData.revalidate(keys), () => keys) });

export const updateAdmin = (model: AdminModel, message: AdminMessage, catalog: ReadonlyArray<CatalogGame>): AdminStep =>
    Match.value(message).pipe(
        Match.withReturnType<AdminStep>(),
        Match.tagsExhaustive({
            SettledAdminKeys: ({ result }) => [
                evo(model, { keys: AsyncData.settle(result), needsElevation: () => false }),
                [],
            ],

            AdminRequiresElevation: () => [
                evo(model, { needsElevation: () => true, busy: Option.none, keys: () => AdminKeys.Idle() }),
                [],
            ],

            ClickedEditScopes: ({ key }) => {
                const apiKey = AsyncData.getData(model.keys).pipe(
                    Option.flatMap((keys) => Option.fromNullishOr(keys.find((found) => found.key === key)))
                );
                return [
                    evo(model, {
                        rateLimitEditor: Option.none,
                        scopesEditor: () =>
                            Option.map(apiKey, (found) => ({ key, scopes: Array.from(found.scopes), scopeTab: "" })),
                    }),
                    [],
                ];
            },
            ToggledAdminScope: ({ scope }) => [
                evo(model, {
                    scopesEditor: Option.map((editor) =>
                        evo(editor, { scopes: (scopes) => toggleScope(scopes, scope, catalog) })
                    ),
                }),
                [],
            ],
            SelectedAdminScopeTab: ({ game }) => [
                evo(model, { scopesEditor: Option.map((editor) => evo(editor, { scopeTab: () => game })) }),
                [],
            ],
            ClickedEditRateLimit: ({ key }) => {
                const apiKey = AsyncData.getData(model.keys).pipe(
                    Option.flatMap((keys) => Option.fromNullishOr(keys.find((found) => found.key === key)))
                );
                return [
                    evo(model, {
                        scopesEditor: Option.none,
                        rateLimitEditor: () =>
                            Option.map(apiKey, (found) => ({
                                key,
                                limit: `${found.rateLimitLimit}`,
                                windowSeconds: `${Math.round(Duration.toSeconds(found.rateLimitWindow))}`,
                            })),
                    }),
                    [],
                ];
            },
            ChangedAdminLimit: ({ value }) => [
                evo(model, { rateLimitEditor: Option.map((editor) => evo(editor, { limit: () => value })) }),
                [],
            ],
            ChangedAdminWindow: ({ value }) => [
                evo(model, { rateLimitEditor: Option.map((editor) => evo(editor, { windowSeconds: () => value })) }),
                [],
            ],
            ClickedCancelAdminEdit: () => [evo(model, { scopesEditor: Option.none, rateLimitEditor: Option.none }), []],
            SubmittedAdminEdit: () => {
                if (Option.isSome(model.scopesEditor)) {
                    const { key, scopes } = model.scopesEditor.value;
                    return [starting(model, key), [SaveScopes({ key, scopes })]];
                }

                if (Option.isSome(model.rateLimitEditor)) {
                    const { key, limit, windowSeconds } = model.rateLimitEditor.value;
                    const parsedLimit = Number.parseInt(limit, 10);
                    const parsedWindow = Number.parseInt(windowSeconds, 10);
                    if (
                        !Number.isInteger(parsedLimit) ||
                        parsedLimit <= 0 ||
                        !Number.isInteger(parsedWindow) ||
                        parsedWindow <= 0
                    ) {
                        return [
                            evo(model, {
                                problem: () => Option.some("rateLimitInvalid" as const),
                            }),
                            [],
                        ];
                    }
                    return [
                        starting(model, key),
                        [SaveRateLimit({ key, limit: parsedLimit, windowSeconds: parsedWindow })],
                    ];
                }

                return [model, []];
            },

            ClickedAdminSetRevoked: ({ key, revoked }) => [starting(model, key), [SetRevokedAdmin({ key, revoked })]],
            ClickedAdminDelete: ({ key }) =>
                Option.contains(model.armedDelete, key)
                    ? [starting(model, key), [DeleteKeyAdmin({ key })]]
                    : [evo(model, { armedDelete: () => Option.some(key), problem: Option.none }), []],

            CompletedAdminRowUpdate: () => [
                evo(refetching(model), {
                    busy: Option.none,
                    notice: () => Option.some("saved" as const),
                    scopesEditor: Option.none,
                    rateLimitEditor: Option.none,
                }),
                [FetchAdminKeys()],
            ],
            CompletedAdminDelete: () => [
                evo(refetching(model), { busy: Option.none, notice: () => Option.some("keyDeleted" as const) }),
                [FetchAdminKeys()],
            ],

            FailedAdminAction: ({ problem }) => [
                evo(model, { busy: Option.none, problem: () => Option.some(problem) }),
                [],
            ],
            AdminSignedOutElsewhere: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

/**
 * A scope a key holds, by name, with what it means on hover. A key may hold a
 * scope the catalog no longer lists, and that still shows, as itself.
 */
const scopeChip = (h: HtmlBuilder<AppMessage>, descriptions: ReadonlyMap<string, string>, name: string): Html =>
    h.span(
        [
            h.Class("font-mono bg-sky-light/40 text-sky-dark rounded px-2 py-0.5 text-base"),
            h.Title(descriptions.get(name) ?? name),
        ],
        [name]
    );

/**
 * The step-up is a server round trip, not an api call: the form posts the
 * password to the server, which sends the browser through tinyburg.app to
 * re-authorize with `towers:read`, and the outcome lands back on /admin.
 */
const elevationForm = <M>(h: HtmlBuilder<M>, msgs: AdminMessages): Html =>
    h.section(
        [h.Class(card + " max-w-md")],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.stepUpHeading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.stepUpIntro]),
            h.form(
                [h.Method("post"), h.Action("/auth/elevate"), h.Class("flex flex-col gap-4")],
                [
                    h.input([
                        h.Type("password"),
                        h.Attribute("name", "password"),
                        h.Attribute("autocomplete", "current-password"),
                        h.Required(true),
                        h.Class(
                            "font-mono focus:border-sky-blue rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xl outline-none"
                        ),
                        h.Placeholder(msgs.passwordPlaceholder),
                    ]),
                    h.button([h.Type("submit"), h.Class(primaryButton)], [msgs.elevate]),
                ]
            ),
        ]
    );

const scopesEditorView = (
    h: HtmlBuilder<AppMessage>,
    msgs: AdminMessages,
    shared: SharedMessages,
    model: AdminModel,
    selected: ReadonlyArray<string>,
    catalog: ReadonlyArray<CatalogGame>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-3")],
        [
            // Everything is on offer here: the admin is who grants the writes.
            scopePicker(h, {
                catalog,
                selected,
                onToggle: (scope) => AdminMessage.ToggledAdminScope({ scope }),
                selectable: () => true,
                activeGame: Option.getOrElse(
                    Option.map(model.scopesEditor, (editor) => editor.scopeTab),
                    () => ""
                ),
                onSelectGame: (game) => AdminMessage.SelectedAdminScopeTab({ game }),
            }),
            h.div(
                [h.Class("flex gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(primaryButton),
                            h.Disabled(selected.length === 0 || Option.isSome(model.busy)),
                            h.OnClick(AdminMessage.SubmittedAdminEdit()),
                        ],
                        [msgs.saveScopes]
                    ),
                    h.button(
                        [h.Type("button"), h.Class(quietButton), h.OnClick(AdminMessage.ClickedCancelAdminEdit())],
                        [shared.cancel]
                    ),
                ]
            ),
        ]
    );

const rateLimitEditorView = (
    h: HtmlBuilder<AppMessage>,
    msgs: AdminMessages,
    shared: SharedMessages,
    model: AdminModel,
    editor: { readonly limit: string; readonly windowSeconds: string }
): Html => {
    const field = (label: string, value: string, onInput: (value: string) => AppMessage): Html =>
        h.label(
            [h.Class("flex items-center gap-2")],
            [
                h.span([h.Class("font-mono text-lg text-gray-700")], [label]),
                h.input([
                    h.Type("text"),
                    h.Attribute("inputmode", "numeric"),
                    h.Class(
                        "font-mono focus:border-sky-blue w-24 rounded-lg border-2 border-gray-300 bg-white px-2 py-1 text-lg outline-none"
                    ),
                    h.Value(value),
                    h.OnInput(onInput),
                ]),
            ]
        );

    return h.div(
        [h.Class("flex flex-wrap items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-3")],
        [
            field(msgs.requestsLabel, editor.limit, (value) => AdminMessage.ChangedAdminLimit({ value })),
            field(msgs.perSecondsLabel, editor.windowSeconds, (value) => AdminMessage.ChangedAdminWindow({ value })),
            h.button(
                [
                    h.Type("button"),
                    h.Class(primaryButton),
                    h.Disabled(Option.isSome(model.busy)),
                    h.OnClick(AdminMessage.SubmittedAdminEdit()),
                ],
                [msgs.saveLimit]
            ),
            h.button(
                [h.Type("button"), h.Class(quietButton), h.OnClick(AdminMessage.ClickedCancelAdminEdit())],
                [shared.cancel]
            ),
        ]
    );
};

const adminKeyRow = (
    h: HtmlBuilder<AppMessage>,
    msgs: AdminMessages,
    shared: SharedMessages,
    key: Key,
    model: AdminModel,
    catalog: ReadonlyArray<CatalogGame>,
    descriptions: ReadonlyMap<string, string>
): Html => {
    const busy = Option.contains(model.busy, key.key);
    const armed = Option.contains(model.armedDelete, key.key);
    const editingScopes = model.scopesEditor.pipe(
        Option.filter((editor) => editor.key === key.key),
        Option.map((editor) => editor.scopes)
    );
    const editingRateLimit = model.rateLimitEditor.pipe(Option.filter((editor) => editor.key === key.key));

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
                    h.code([h.Class("font-mono min-w-0 flex-1 text-xl break-all text-gray-800")], [key.key]),
                    key.revoked
                        ? h.span(
                              [h.Class("font-pixel rounded bg-red-700 px-2 py-1 text-[0.5rem] text-white")],
                              [shared.revokedBadge]
                          )
                        : h.empty,
                ]
            ),
            h.p(
                [h.Class("font-mono text-base text-gray-500")],
                [
                    Option.match(key.ownerSub, {
                        onSome: (sub) => msgs.owner(sub),
                        onNone: () => msgs.noOwner,
                    }),
                    ...Option.match(key.description, {
                        onSome: (description) => [` · ${description}`],
                        onNone: () => [],
                    }),
                    ` · ${shared.rateLimit(key.rateLimitLimit, Math.round(Duration.toSeconds(key.rateLimitWindow)))}`,
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-1.5")],
                Array.from(key.scopes, (scope) => scopeChip(h, descriptions, scope))
            ),
            ...Option.match(editingScopes, {
                onSome: (selected) => [scopesEditorView(h, msgs, shared, model, selected, catalog)],
                onNone: () => [],
            }),
            ...Option.match(editingRateLimit, {
                onSome: (editor) => [rateLimitEditorView(h, msgs, shared, model, editor)],
                onNone: () => [],
            }),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.OnClick(AdminMessage.ClickedEditScopes({ key: key.key })),
                        ],
                        [msgs.scopesButton]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.OnClick(AdminMessage.ClickedEditRateLimit({ key: key.key })),
                        ],
                        [msgs.rateLimitButton]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.OnClick(AdminMessage.ClickedAdminSetRevoked({ key: key.key, revoked: !key.revoked })),
                        ],
                        [busy ? "..." : key.revoked ? shared.reEnable : shared.revoke]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(dangerButton),
                            h.Disabled(busy),
                            h.OnClick(AdminMessage.ClickedAdminDelete({ key: key.key })),
                        ],
                        [busy ? "..." : armed ? shared.reallyDelete : shared.delete]
                    ),
                ]
            ),
        ]
    );
};

const keysTable = (
    h: HtmlBuilder<AppMessage>,
    msgs: AdminMessages,
    shared: SharedMessages,
    model: AdminModel,
    catalog: ReadonlyArray<CatalogGame>
): Html => {
    const descriptions = descriptionsOf(catalog);
    const list = (keys: ReadonlyArray<Key>): Html =>
        h.div(
            [h.Class("flex flex-col gap-4")],
            keys.length === 0
                ? [h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.emptyState])]
                : keys.map((key) => adminKeyRow(h, msgs, shared, key, model, catalog, descriptions))
        );

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.allKeysHeading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.allKeysIntro]),
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

export const adminView = (
    h: HtmlBuilder<AppMessage>,
    msgs: AdminMessages,
    shared: SharedMessages,
    model: AdminModel,
    scopes: ScopeCatalogData
): Html => {
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
                            h.h1([h.Class("font-pixel text-dark-blue text-lg")], [msgs.heading]),
                            h.a([h.Href("/keys"), h.Class(quietButton + " no-underline")], [msgs.yourKeysLink]),
                        ]
                    ),
                    ...Option.match(model.notice, {
                        onSome: (notice) => [banner(h, "notice", msgs.notices[notice])],
                        onNone: () => [],
                    }),
                    ...Option.match(model.problem, {
                        onSome: (problem) => [banner(h, "problem", msgs.problems[problem])],
                        onNone: () => [],
                    }),
                    model.needsElevation ? elevationForm(h, msgs) : keysTable(h, msgs, shared, model, catalog),
                ]
            ),
        ]
    );
};
