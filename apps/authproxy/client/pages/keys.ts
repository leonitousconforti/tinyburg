import { DateTime, Duration, Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { banner, card, dangerButton, primaryButton, quietButton, smallButton } from "@tinyburg/ui/Chrome";
import { AsyncData, Command } from "foldkit";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { Account } from "../../domain/model.ts";
import { ELEVATED_SCOPES, MAX_KEYS_PER_USER, SELF_SERVE_SCOPES } from "../../shared/scopes.ts";
import { Self, type SessionInfo } from "../backend.ts";

/**
 * One key as /self/keys lists it: the same account model the proxy's
 * authorization middleware reads, minus nothing, because the key belongs to
 * the person looking at it.
 */
type Key = typeof Account.json.Type;

// MODEL

export const Keys = AsyncData.Schema(S.Array(Account.json), S.String);

export const KeysModel = S.Struct({
    keys: Keys.schema,

    // The row currently mid-request, so only its own button says so. The
    // create form uses the sentinel "create".
    busy: S.Option(S.String),
    notice: S.Option(S.String),
    problem: S.Option(S.String),

    // Keys shown in full rather than masked.
    revealed: S.Array(S.String),

    // Deleting takes two clicks: the first arms the button, the second acts.
    armedDelete: S.Option(S.String),

    form: S.Struct({
        open: S.Boolean,
        scopes: S.Array(S.String),
        description: S.String,
    }),
});
export type KeysModel = typeof KeysModel.Type;

const closedForm = { open: false, scopes: [] as ReadonlyArray<string>, description: "" };

export const initialKeys: KeysModel = {
    keys: Keys.Idle(),
    busy: Option.none(),
    notice: Option.none(),
    problem: Option.none(),
    revealed: [],
    armedDelete: Option.none(),
    form: closedForm,
};

/** The keys page as entered: held data stays, transient row state clears. */
export const enterKeys = (previous: KeysModel): KeysModel =>
    evo(previous, {
        busy: Option.none,
        notice: Option.none,
        problem: Option.none,
        armedDelete: Option.none,
        form: () => closedForm,
    });

// MESSAGE

export const SettledKeys = m("SettledKeys", { result: S.Result(S.Array(Account.json), S.String) });

export const ClickedOpenCreate = m("ClickedOpenCreate");
export const ClickedCancelCreate = m("ClickedCancelCreate");
export const ToggledScope = m("ToggledScope", { path: S.String });
export const ChangedDescription = m("ChangedDescription", { value: S.String });
export const SubmittedCreate = m("SubmittedCreate");
export const CompletedCreate = m("CompletedCreate", { key: Account.json });

export const ClickedRotate = m("ClickedRotate", { key: S.String });
export const CompletedRotate = m("CompletedRotate", { key: Account.json });

export const ClickedSetRevoked = m("ClickedSetRevoked", { key: S.String, revoked: S.Boolean });
export const CompletedSetRevoked = m("CompletedSetRevoked", { key: Account.json });

export const ClickedDelete = m("ClickedDelete", { key: S.String });
export const CompletedDelete = m("CompletedDelete");

export const ClickedCopy = m("ClickedCopy", { key: S.String });
export const CopiedKey = m("CopiedKey");
export const ToggledReveal = m("ToggledReveal", { key: S.String });

export const FailedAction = m("FailedAction", { message: S.String });

/** The session ended somewhere else while this page was open. */
export const SignedOutElsewhere = m("SignedOutElsewhere");

export const KeysMessage = S.Union([
    SettledKeys,
    ClickedOpenCreate,
    ClickedCancelCreate,
    ToggledScope,
    ChangedDescription,
    SubmittedCreate,
    CompletedCreate,
    ClickedRotate,
    CompletedRotate,
    ClickedSetRevoked,
    CompletedSetRevoked,
    ClickedDelete,
    CompletedDelete,
    ClickedCopy,
    CopiedKey,
    ToggledReveal,
    FailedAction,
    SignedOutElsewhere,
]);
export type KeysMessage = typeof KeysMessage.Type;

// COMMAND

const LOAD_FAILED = "We couldn't load your keys. Please try again.";
const ACTION_FAILED = "That didn't work. Please try again.";

export const FetchKeys = Command.define("FetchKeys", {
    messages: [SettledKeys, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const keys = yield* self.SelfServiceGroup.listKeys();
        return SettledKeys({ result: Result.succeed(keys) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(SettledKeys({ result: Result.fail(LOAD_FAILED) })))
    ),
});

const CreateKey = Command.define("CreateKey", {
    args: { scopes: S.Array(S.String), description: S.String },
    messages: [CompletedCreate, FailedAction, SignedOutElsewhere],
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
            return CompletedCreate({ key });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catchTag("BadRequest", () =>
                Effect.succeed(
                    FailedAction({
                        message: `That request was refused. Keys need at least one scope, and each account may hold at most ${MAX_KEYS_PER_USER} keys.`,
                    })
                )
            ),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

const RotateKey = Command.define("RotateKey", {
    args: { key: S.String },
    messages: [CompletedRotate, FailedAction, SignedOutElsewhere],
    execute: ({ key }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const rotated = yield* self.SelfServiceGroup.rotateKey({ params: { key } });
            return CompletedRotate({ key: rotated });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

const SetRevoked = Command.define("SetRevoked", {
    args: { key: S.String, revoked: S.Boolean },
    messages: [CompletedSetRevoked, FailedAction, SignedOutElsewhere],
    execute: ({ key, revoked }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const updated = yield* revoked
                ? self.SelfServiceGroup.revokeKey({ params: { key } })
                : self.SelfServiceGroup.enableKey({ params: { key } });
            return CompletedSetRevoked({ key: updated });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

const DeleteKey = Command.define("DeleteKey", {
    args: { key: S.String },
    messages: [CompletedDelete, FailedAction, SignedOutElsewhere],
    execute: ({ key }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            yield* self.SelfServiceGroup.deleteKey({ params: { key } });
            return CompletedDelete();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

const CopyKey = Command.define("CopyKey", {
    args: { key: S.String },
    messages: [CopiedKey, FailedAction],
    execute: ({ key }) =>
        Effect.tryPromise(() => navigator.clipboard.writeText(key)).pipe(
            Effect.as(CopiedKey()),
            Effect.catch(() =>
                Effect.succeed(FailedAction({ message: "We couldn't reach your clipboard. Reveal and copy by hand." }))
            )
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

export const updateKeys = (model: KeysModel, message: KeysMessage): KeysStep =>
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
            ToggledScope: ({ path }) => [
                evo(model, {
                    form: (form) =>
                        evo(form, {
                            scopes: (scopes) =>
                                scopes.includes(path) ? scopes.filter((scope) => scope !== path) : [...scopes, path],
                        }),
                }),
                [],
            ],
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
            CopiedKey: () => [evo(model, { notice: () => Option.some("Copied to your clipboard.") }), []],
            ToggledReveal: ({ key }) => [
                evo(model, {
                    revealed: (revealed) =>
                        revealed.includes(key)
                            ? revealed.filter((revealedKey) => revealedKey !== key)
                            : [...revealed, key],
                }),
                [],
            ],

            // A fresh credential is the one moment the full key matters, so it
            // arrives revealed.
            CompletedCreate: ({ key }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    form: () => closedForm,
                    notice: () => Option.some("Key created. It works immediately."),
                    revealed: (revealed) => [...revealed, key.key],
                }),
                [FetchKeys()],
            ],
            CompletedRotate: ({ key }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () =>
                        Option.some("Key rotated. The old key stopped working the moment the new one was minted."),
                    revealed: (revealed) => [...revealed, key.key],
                }),
                [FetchKeys()],
            ],
            CompletedSetRevoked: ({ key }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () =>
                        Option.some(key.revoked ? "Key revoked. Requests with it now fail." : "Key re-enabled."),
                }),
                [FetchKeys()],
            ],
            CompletedDelete: () => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () => Option.some("Key deleted."),
                }),
                [FetchKeys()],
            ],

            FailedAction: ({ message }) => [evo(model, { busy: Option.none, problem: () => Option.some(message) }), []],

            SignedOutElsewhere: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

const scopeLabels: ReadonlyMap<string, string> = new Map(
    [...SELF_SERVE_SCOPES, ...ELEVATED_SCOPES].map((scope) => [scope.path, scope.label])
);

const maskKey = (key: string): string => `${key.slice(0, 8)}-····-····-····-············`;

const formatDate = (when: DateTime.Utc): string =>
    DateTime.format(when, { locale: "en-US", month: "long", day: "numeric", year: "numeric" });

const scopeChip = (h: HtmlBuilder<AppMessage>, path: string): Html =>
    h.span(
        [h.Class("font-mono bg-sky-light/40 text-sky-dark rounded px-2 py-0.5 text-base"), h.Title(path)],
        [scopeLabels.get(path) ?? path]
    );

const keyRow = (h: HtmlBuilder<AppMessage>, key: Key, model: KeysModel): Html => {
    const busy = Option.contains(model.busy, key.key);
    const revealed = model.revealed.includes(key.key);
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
                        [h.Class("font-mono min-w-0 flex-1 text-xl break-all text-gray-800")],
                        [revealed ? key.key : maskKey(key.key)]
                    ),
                    key.revoked
                        ? h.span(
                              [h.Class("font-pixel rounded bg-red-700 px-2 py-1 text-[0.5rem] text-white")],
                              ["Revoked"]
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
                Array.from(key.scopes, (scope) => scopeChip(h, scope))
            ),
            h.p(
                [h.Class("font-mono text-base text-gray-500")],
                [
                    `Created ${formatDate(key.createdAt)} · Last used ${formatDate(key.lastUsedAt)} · ` +
                        `${key.rateLimitLimit} requests / ${Math.round(Duration.toSeconds(key.rateLimitWindow))}s`,
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [h.Type("button"), h.Class(smallButton), h.OnClick(ToggledReveal({ key: key.key }))],
                        [revealed ? "Hide" : "Reveal"]
                    ),
                    h.button(
                        [h.Type("button"), h.Class(smallButton), h.OnClick(ClickedCopy({ key: key.key }))],
                        ["Copy"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.Title("Mint a new key for this row; the old key stops working immediately"),
                            h.OnClick(ClickedRotate({ key: key.key })),
                        ],
                        [busy ? "..." : "Rotate"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(smallButton),
                            h.Disabled(busy),
                            h.OnClick(ClickedSetRevoked({ key: key.key, revoked: !key.revoked })),
                        ],
                        [busy ? "..." : key.revoked ? "Re-enable" : "Revoke"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(dangerButton),
                            h.Disabled(busy),
                            h.OnClick(ClickedDelete({ key: key.key })),
                        ],
                        [busy ? "..." : armed ? "Really delete?" : "Delete"]
                    ),
                ]
            ),
        ]
    );
};

const scopeCheckbox = (
    h: HtmlBuilder<AppMessage>,
    model: KeysModel,
    path: string,
    label: string,
    description: string
): Html =>
    h.label(
        [
            h.Class(
                "hover:border-sky-blue flex cursor-pointer items-start gap-3 rounded-lg border-2 border-gray-300 bg-white px-3 py-2"
            ),
        ],
        [
            h.input([
                h.Type("checkbox"),
                h.Class("mt-1.5"),
                h.Checked(model.form.scopes.includes(path)),
                h.OnClick(ToggledScope({ path })),
            ]),
            h.span(
                [h.Class("min-w-0")],
                [
                    h.span([h.Class("font-mono block text-xl text-gray-800")], [label]),
                    h.span([h.Class("font-mono block text-base text-gray-500")], [description]),
                ]
            ),
        ]
    );

const elevatedRow = (h: HtmlBuilder<AppMessage>, label: string, description: string): Html =>
    h.div(
        [
            h.Class(
                "flex items-start gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2 opacity-70"
            ),
        ],
        [
            h.span(
                [h.Class("min-w-0")],
                [
                    h.span([h.Class("font-mono block text-xl text-gray-600")], [label]),
                    h.span([h.Class("font-mono block text-base text-gray-500")], [description]),
                ]
            ),
        ]
    );

const createForm = (h: HtmlBuilder<AppMessage>, model: KeysModel): Html => {
    const creating = Option.contains(model.busy, "create");

    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.label(
                [h.Class("flex flex-col gap-1")],
                [
                    h.span([h.Class("font-pixel text-[0.55rem] text-gray-600")], ["What is this key for?"]),
                    h.input([
                        h.Type("text"),
                        h.Class(
                            "font-mono focus:border-sky-blue rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xl outline-none"
                        ),
                        h.Placeholder("Optional description, e.g. my tower stats bot"),
                        h.Value(model.form.description),
                        h.OnInput((value) => ChangedDescription({ value })),
                    ]),
                ]
            ),
            h.p([h.Class("font-pixel text-[0.55rem] text-gray-600")], ["Read-only scopes (pick at least one)"]),
            h.div(
                [h.Class("grid gap-2 sm:grid-cols-2")],
                SELF_SERVE_SCOPES.map((scope) => scopeCheckbox(h, model, scope.path, scope.label, scope.description))
            ),
            h.p(
                [h.Class("font-pixel text-[0.55rem] text-gray-600")],
                ["Write scopes are granted by hand — reach out on Discord"]
            ),
            h.div(
                [h.Class("grid gap-2 sm:grid-cols-2")],
                ELEVATED_SCOPES.map((scope) => elevatedRow(h, scope.label, scope.description))
            ),
            h.div(
                [h.Class("flex flex-wrap gap-3")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(primaryButton),
                            h.Disabled(model.form.scopes.length === 0 || creating),
                            h.OnClick(SubmittedCreate()),
                        ],
                        [creating ? "..." : "Create key"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(quietButton),
                            h.Disabled(creating),
                            h.OnClick(ClickedCancelCreate()),
                        ],
                        ["Cancel"]
                    ),
                ]
            ),
        ]
    );
};

const keysSection = (h: HtmlBuilder<AppMessage>, model: KeysModel): Html => {
    const list = (keys: ReadonlyArray<Key>): Html =>
        h.div(
            [h.Class("flex flex-col gap-4")],
            [
                ...(keys.length === 0
                    ? [
                          h.p(
                              [h.Class("font-mono text-xl text-gray-600")],
                              ["No keys yet. Create one and start calling the proxy."]
                          ),
                      ]
                    : keys.map((key) => keyRow(h, key, model))),
                model.form.open
                    ? createForm(h, model)
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
                                              ? `Each account may hold at most ${MAX_KEYS_PER_USER} keys`
                                              : "Provision a new key"
                                      ),
                                      h.OnClick(ClickedOpenCreate()),
                                  ],
                                  ["+ New key"]
                              ),
                          ]
                      ),
            ]
        );

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Your API Keys"]),
            h.p(
                [h.Class("font-mono mb-6 text-lg text-gray-500")],
                [
                    "Send a key as a bearer token: Authorization: Bearer <key>. Rotate any key you may have leaked, and delete the ones you no longer use.",
                ]
            ),
            AsyncData.match(model.keys, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your keys..."]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your keys..."]),
                onFailure: (error) => h.p([h.Class("font-mono text-xl text-red-700")], [error]),
                onRefreshing: list,
                onStale: ({ data }) => list(data),
                onSuccess: list,
            }),
        ]
    );
};

export const keysView = (h: HtmlBuilder<AppMessage>, model: KeysModel, session: SessionInfo): Html =>
    h.div(
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
                                        onSome: (name) => `${name}'s API keys`,
                                        onNone: () => "Your API keys",
                                    }),
                                ]
                            ),
                            h.form(
                                [h.Method("post"), h.Action("/logout")],
                                [h.button([h.Type("submit"), h.Class(quietButton)], ["Sign out"])]
                            ),
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
                    keysSection(h, model),
                ]
            ),
        ]
    );
