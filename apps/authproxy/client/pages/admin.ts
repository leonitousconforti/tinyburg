import { Duration, Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { banner, card, dangerButton, primaryButton, quietButton, smallButton } from "@tinyburg/ui/Chrome";
import { AsyncData, Command } from "foldkit";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { Account } from "../../domain/model.ts";
import { Session } from "../../domain/sessions.ts";
import { ELEVATED_SCOPES, SELF_SERVE_SCOPES } from "../../shared/scopes.ts";
import { Self } from "../backend.ts";

type Key = typeof Account.json.Type;

// MODEL

export const AdminKeys = AsyncData.Schema(S.Array(Account.json), S.String);

const ScopesEditor = S.Struct({ key: S.String, scopes: S.Array(S.String) });
const RateLimitEditor = S.Struct({ key: S.String, limit: S.String, windowSeconds: S.String });

export const AdminModel = S.Struct({
    keys: AdminKeys.schema,

    // The admin surface answered Forbidden: the session needs the step-up.
    needsElevation: S.Boolean,
    password: S.String,

    busy: S.Option(S.String),
    notice: S.Option(S.String),
    problem: S.Option(S.String),
    armedDelete: S.Option(S.String),

    // At most one row is being edited at a time.
    scopesEditor: S.Option(ScopesEditor),
    rateLimitEditor: S.Option(RateLimitEditor),
});
export type AdminModel = typeof AdminModel.Type;

export const initialAdmin: AdminModel = {
    keys: AdminKeys.Idle(),
    needsElevation: false,
    password: "",
    busy: Option.none(),
    notice: Option.none(),
    problem: Option.none(),
    armedDelete: Option.none(),
    scopesEditor: Option.none(),
    rateLimitEditor: Option.none(),
};

/** The admin page as entered: held data stays, transient state clears. */
export const enterAdmin = (previous: AdminModel): AdminModel =>
    evo(previous, {
        password: () => "",
        busy: Option.none,
        notice: Option.none,
        problem: Option.none,
        armedDelete: Option.none,
        scopesEditor: Option.none,
        rateLimitEditor: Option.none,
    });

// MESSAGE

export const SettledAdminKeys = m("SettledAdminKeys", { result: S.Result(S.Array(Account.json), S.String) });

/** The admin surface refused a plain session; show the step-up form. */
export const AdminRequiresElevation = m("AdminRequiresElevation");
export const ChangedAdminPassword = m("ChangedAdminPassword", { value: S.String });
export const SubmittedElevation = m("SubmittedElevation");
export const CompletedElevation = m("CompletedElevation", { session: Session.json });
export const FailedElevation = m("FailedElevation");

export const ClickedEditScopes = m("ClickedEditScopes", { key: S.String });
export const ToggledAdminScope = m("ToggledAdminScope", { path: S.String });
export const ClickedEditRateLimit = m("ClickedEditRateLimit", { key: S.String });
export const ChangedAdminLimit = m("ChangedAdminLimit", { value: S.String });
export const ChangedAdminWindow = m("ChangedAdminWindow", { value: S.String });
export const ClickedCancelAdminEdit = m("ClickedCancelAdminEdit");
export const SubmittedAdminEdit = m("SubmittedAdminEdit");

export const ClickedAdminSetRevoked = m("ClickedAdminSetRevoked", { key: S.String, revoked: S.Boolean });
export const ClickedAdminDelete = m("ClickedAdminDelete", { key: S.String });
export const CompletedAdminRowUpdate = m("CompletedAdminRowUpdate");
export const CompletedAdminDelete = m("CompletedAdminDelete");
export const FailedAdminAction = m("FailedAdminAction", { message: S.String });

/** The session ended somewhere else while this page was open. */
export const AdminSignedOutElsewhere = m("AdminSignedOutElsewhere");

export const AdminMessage = S.Union([
    SettledAdminKeys,
    AdminRequiresElevation,
    ChangedAdminPassword,
    SubmittedElevation,
    CompletedElevation,
    FailedElevation,
    ClickedEditScopes,
    ToggledAdminScope,
    ClickedEditRateLimit,
    ChangedAdminLimit,
    ChangedAdminWindow,
    ClickedCancelAdminEdit,
    SubmittedAdminEdit,
    ClickedAdminSetRevoked,
    ClickedAdminDelete,
    CompletedAdminRowUpdate,
    CompletedAdminDelete,
    FailedAdminAction,
    AdminSignedOutElsewhere,
]);
export type AdminMessage = typeof AdminMessage.Type;

// COMMAND

const LOAD_FAILED = "We couldn't load the keys. Please try again.";
const ACTION_FAILED = "That didn't work. Please try again.";
const ELEVATION_FAILED = "Elevation was refused. Check the password and that your account holds an allowlisted tower.";

export const FetchAdminKeys = Command.define("FetchAdminKeys", {
    messages: [SettledAdminKeys, AdminRequiresElevation, AdminSignedOutElsewhere],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const keys = yield* self.AdminGroup.listKeys();
        return SettledAdminKeys({ result: Result.succeed(keys) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(AdminSignedOutElsewhere())),
        Effect.catchTag("Forbidden", () => Effect.succeed(AdminRequiresElevation())),
        Effect.catch(() => Effect.succeed(SettledAdminKeys({ result: Result.fail(LOAD_FAILED) })))
    ),
});

const Elevate = Command.define("Elevate", {
    args: { password: S.String },
    messages: [CompletedElevation, FailedElevation, AdminSignedOutElsewhere],
    execute: ({ password }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const session = yield* self.SelfServiceGroup.elevate({ payload: { password } });
            return CompletedElevation({ session });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminSignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(FailedElevation()))
        ),
});

const SaveScopes = Command.define("SaveScopes", {
    args: { key: S.String, scopes: S.Array(S.String) },
    messages: [CompletedAdminRowUpdate, FailedAdminAction, AdminRequiresElevation, AdminSignedOutElsewhere],
    execute: ({ key, scopes }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.AdminGroup.scopes({ params: { key }, payload: { scopes } });
            return CompletedAdminRowUpdate();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(FailedAdminAction({ message: ACTION_FAILED })))
        ),
});

const SaveRateLimit = Command.define("SaveRateLimit", {
    args: { key: S.String, limit: S.Int, windowSeconds: S.Int },
    messages: [CompletedAdminRowUpdate, FailedAdminAction, AdminRequiresElevation, AdminSignedOutElsewhere],
    execute: ({ key, limit, windowSeconds }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.AdminGroup.rateLimit({
                params: { key },
                payload: { limit, window: Duration.seconds(windowSeconds) },
            });
            return CompletedAdminRowUpdate();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(FailedAdminAction({ message: ACTION_FAILED })))
        ),
});

const SetRevokedAdmin = Command.define("SetRevokedAdmin", {
    args: { key: S.String, revoked: S.Boolean },
    messages: [CompletedAdminRowUpdate, FailedAdminAction, AdminRequiresElevation, AdminSignedOutElsewhere],
    execute: ({ key, revoked }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* revoked ? self.AdminGroup.revoke({ params: { key } }) : self.AdminGroup.enable({ params: { key } });
            return CompletedAdminRowUpdate();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(FailedAdminAction({ message: ACTION_FAILED })))
        ),
});

const DeleteKeyAdmin = Command.define("DeleteKeyAdmin", {
    args: { key: S.String },
    messages: [CompletedAdminDelete, FailedAdminAction, AdminRequiresElevation, AdminSignedOutElsewhere],
    execute: ({ key }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.AdminGroup.deleteKey({ params: { key } });
            return CompletedAdminDelete();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(AdminSignedOutElsewhere())),
            Effect.catchTag("Forbidden", () => Effect.succeed(AdminRequiresElevation())),
            Effect.catch(() => Effect.succeed(FailedAdminAction({ message: ACTION_FAILED })))
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

export const updateAdmin = (model: AdminModel, message: AdminMessage): AdminStep =>
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
            ChangedAdminPassword: ({ value }) => [evo(model, { password: () => value }), []],
            SubmittedElevation: () => [starting(model, "elevate"), [Elevate({ password: model.password })]],
            CompletedElevation: () => [
                evo(model, {
                    busy: Option.none,
                    needsElevation: () => false,
                    password: () => "",
                    notice: () => Option.some("Elevated for one hour."),
                }),
                [FetchAdminKeys()],
            ],
            FailedElevation: () => [
                evo(model, { busy: Option.none, password: () => "", problem: () => Option.some(ELEVATION_FAILED) }),
                [],
            ],

            ClickedEditScopes: ({ key }) => {
                const account = AsyncData.getData(model.keys).pipe(
                    Option.flatMap((keys) => Option.fromNullishOr(keys.find((found) => found.key === key)))
                );
                return [
                    evo(model, {
                        rateLimitEditor: Option.none,
                        scopesEditor: () => Option.map(account, (found) => ({ key, scopes: Array.from(found.scopes) })),
                    }),
                    [],
                ];
            },
            ToggledAdminScope: ({ path }) => [
                evo(model, {
                    scopesEditor: Option.map((editor) =>
                        evo(editor, {
                            scopes: (scopes) =>
                                scopes.includes(path) ? scopes.filter((scope) => scope !== path) : [...scopes, path],
                        })
                    ),
                }),
                [],
            ],
            ClickedEditRateLimit: ({ key }) => {
                const account = AsyncData.getData(model.keys).pipe(
                    Option.flatMap((keys) => Option.fromNullishOr(keys.find((found) => found.key === key)))
                );
                return [
                    evo(model, {
                        scopesEditor: Option.none,
                        rateLimitEditor: () =>
                            Option.map(account, (found) => ({
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
                                problem: () => Option.some("Rate limits need positive whole numbers."),
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
                    notice: () => Option.some("Saved."),
                    scopesEditor: Option.none,
                    rateLimitEditor: Option.none,
                }),
                [FetchAdminKeys()],
            ],
            CompletedAdminDelete: () => [
                evo(refetching(model), { busy: Option.none, notice: () => Option.some("Key deleted.") }),
                [FetchAdminKeys()],
            ],

            FailedAdminAction: ({ message }) => [
                evo(model, { busy: Option.none, problem: () => Option.some(message) }),
                [],
            ],
            AdminSignedOutElsewhere: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

const ALL_SCOPES = [...SELF_SERVE_SCOPES, ...ELEVATED_SCOPES];
const scopeLabels: ReadonlyMap<string, string> = new Map(ALL_SCOPES.map((scope) => [scope.path, scope.label]));

const scopeChip = (h: HtmlBuilder<AppMessage>, path: string): Html =>
    h.span(
        [h.Class("font-mono bg-sky-light/40 text-sky-dark rounded px-2 py-0.5 text-base"), h.Title(path)],
        [scopeLabels.get(path) ?? path]
    );

const elevationForm = (h: HtmlBuilder<AppMessage>, model: AdminModel): Html => {
    const busy = Option.contains(model.busy, "elevate");

    return h.section(
        [h.Class(card + " max-w-md")],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Step Up"]),
            h.p(
                [h.Class("font-mono mb-6 text-lg text-gray-500")],
                [
                    "Admin actions need more than a session: your Tinyburg account must hold an allowlisted tower, and you enter the admin password. Elevation lasts an hour.",
                ]
            ),
            h.div(
                [h.Class("flex flex-col gap-4")],
                [
                    h.input([
                        h.Type("password"),
                        h.Class(
                            "font-mono focus:border-sky-blue rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xl outline-none"
                        ),
                        h.Placeholder("Admin password"),
                        h.Value(model.password),
                        h.OnInput((value) => ChangedAdminPassword({ value })),
                    ]),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(primaryButton),
                            h.Disabled(model.password === "" || busy),
                            h.OnClick(SubmittedElevation()),
                        ],
                        [busy ? "..." : "Elevate"]
                    ),
                ]
            ),
        ]
    );
};

const scopesEditorView = (h: HtmlBuilder<AppMessage>, model: AdminModel, selected: ReadonlyArray<string>): Html =>
    h.div(
        [h.Class("flex flex-col gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-3")],
        [
            h.div(
                [h.Class("grid gap-1.5 sm:grid-cols-2")],
                ALL_SCOPES.map((scope) =>
                    h.label(
                        [h.Class("flex cursor-pointer items-center gap-2")],
                        [
                            h.input([
                                h.Type("checkbox"),
                                h.Checked(selected.includes(scope.path)),
                                h.OnClick(ToggledAdminScope({ path: scope.path })),
                            ]),
                            h.span([h.Class("font-mono text-lg text-gray-700"), h.Title(scope.path)], [scope.label]),
                        ]
                    )
                )
            ),
            h.div(
                [h.Class("flex gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(primaryButton),
                            h.Disabled(selected.length === 0 || Option.isSome(model.busy)),
                            h.OnClick(SubmittedAdminEdit()),
                        ],
                        ["Save scopes"]
                    ),
                    h.button([h.Type("button"), h.Class(quietButton), h.OnClick(ClickedCancelAdminEdit())], ["Cancel"]),
                ]
            ),
        ]
    );

const rateLimitEditorView = (
    h: HtmlBuilder<AppMessage>,
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
            field("Requests", editor.limit, (value) => ChangedAdminLimit({ value })),
            field("per seconds", editor.windowSeconds, (value) => ChangedAdminWindow({ value })),
            h.button(
                [
                    h.Type("button"),
                    h.Class(primaryButton),
                    h.Disabled(Option.isSome(model.busy)),
                    h.OnClick(SubmittedAdminEdit()),
                ],
                ["Save limit"]
            ),
            h.button([h.Type("button"), h.Class(quietButton), h.OnClick(ClickedCancelAdminEdit())], ["Cancel"]),
        ]
    );
};

const adminKeyRow = (h: HtmlBuilder<AppMessage>, key: Key, model: AdminModel): Html => {
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
                              ["Revoked"]
                          )
                        : h.empty,
                ]
            ),
            h.p(
                [h.Class("font-mono text-base text-gray-500")],
                [
                    Option.match(key.ownerSub, {
                        onSome: (sub) => `Owner ${sub}`,
                        onNone: () => "No owner (admin-issued)",
                    }),
                    ...Option.match(key.description, {
                        onSome: (description) => [` · ${description}`],
                        onNone: () => [],
                    }),
                    ` · ${key.rateLimitLimit} requests / ${Math.round(Duration.toSeconds(key.rateLimitWindow))}s`,
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-1.5")],
                Array.from(key.scopes, (scope) => scopeChip(h, scope))
            ),
            ...Option.match(editingScopes, {
                onSome: (selected) => [scopesEditorView(h, model, selected)],
                onNone: () => [],
            }),
            ...Option.match(editingRateLimit, {
                onSome: (editor) => [rateLimitEditorView(h, model, editor)],
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
                            h.OnClick(ClickedEditScopes({ key: key.key })),
                        ],
                        ["Scopes"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.OnClick(ClickedEditRateLimit({ key: key.key })),
                        ],
                        ["Rate limit"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.OnClick(ClickedAdminSetRevoked({ key: key.key, revoked: !key.revoked })),
                        ],
                        [busy ? "..." : key.revoked ? "Re-enable" : "Revoke"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(dangerButton),
                            h.Disabled(busy),
                            h.OnClick(ClickedAdminDelete({ key: key.key })),
                        ],
                        [busy ? "..." : armed ? "Really delete?" : "Delete"]
                    ),
                ]
            ),
        ]
    );
};

const keysTable = (h: HtmlBuilder<AppMessage>, model: AdminModel): Html => {
    const list = (keys: ReadonlyArray<Key>): Html =>
        h.div(
            [h.Class("flex flex-col gap-4")],
            keys.length === 0
                ? [h.p([h.Class("font-mono text-xl text-gray-600")], ["No keys exist yet."])]
                : keys.map((key) => adminKeyRow(h, key, model))
        );

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["All Keys"]),
            h.p(
                [h.Class("font-mono mb-6 text-lg text-gray-500")],
                ["Every key the proxy has issued, whoever holds it. Write scopes are granted here."]
            ),
            AsyncData.match(model.keys, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading..."]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading..."]),
                onFailure: (error) => h.p([h.Class("font-mono text-xl text-red-700")], [error]),
                onRefreshing: list,
                onStale: ({ data }) => list(data),
                onSuccess: list,
            }),
        ]
    );
};

export const adminView = (h: HtmlBuilder<AppMessage>, model: AdminModel): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            h.div(
                [h.Class("flex w-full max-w-3xl flex-col gap-6")],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center justify-between gap-3")],
                        [
                            h.h1([h.Class("font-pixel text-dark-blue text-lg")], ["Admin"]),
                            h.a([h.Href("/keys"), h.Class(quietButton + " no-underline")], ["Your keys"]),
                        ]
                    ),
                    ...Option.match(model.notice, {
                        onSome: (text) => [banner(h, "notice", text)],
                        onNone: () => [],
                    }),
                    ...Option.match(model.problem, {
                        onSome: (text) => [banner(h, "problem", text)],
                        onNone: () => [],
                    }),
                    model.needsElevation ? elevationForm(h, model) : keysTable(h, model),
                ]
            ),
        ]
    );
