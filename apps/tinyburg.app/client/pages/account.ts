import { DateTime, Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { AccountMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { type Language, longDate, relativeTime } from "@tinyburg/i18n";
import { AsyncData, Command } from "foldkit";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { OAuthAccount, Session } from "../../domain/models.ts";
import { Auth, type SessionUser } from "../backend.ts";
import { classifyOAuthError } from "../oauthErrors.ts";
import { appBackLink } from "../ui/chrome.ts";
import { discordIcon, googleIcon } from "../ui/icons.ts";

type LinkedAccount = typeof OAuthAccount.json.Type;
type OAuthProviderName = typeof OAuthAccount.fields.provider.Type;

/**
 * One signed-in browser as /auth/sessions lists it: the same model fields the
 * endpoint builds its response from, plus whether it is the session asking.
 * Built from the domain model rather than exported by the api definition; the
 * derived client's return type checks the two agree at every
 * `Result.succeed(sessions)` below, so they cannot drift apart quietly.
 */
const SessionSummary = S.Struct({ ...Session.json.fields, current: S.Boolean });
type SessionSummary = typeof SessionSummary.Type;

// MODEL

/**
 * What the page has to say about itself is stored as keys (plus any data the
 * phrasing needs) rather than finished sentences: commands and update run
 * without knowing the language, so only the view turns these into copy.
 */
export const AccountNotice = S.Union([
    S.Literals(["connected", "alreadyConnected", "disconnected", "linkCancelled"]),
    S.Struct({ revoked: S.Number }),
]);
export type AccountNotice = typeof AccountNotice.Type;

export const AccountProblem = S.Literals([
    "linkExpired",
    "linkFailed",
    "accountTaken",
    "actionFailed",
    "lastSignInMethod",
]);
export type AccountProblem = typeof AccountProblem.Type;

const LoadFailed = S.Literals(["loadFailed"]);

export const Sessions = AsyncData.Schema(S.Array(SessionSummary), LoadFailed);
export const LinkedAccounts = AsyncData.Schema(S.Array(OAuthAccount.json), LoadFailed);

export const AccountModel = S.Struct({
    sessions: Sessions.schema,
    accounts: LinkedAccounts.schema,

    // The clock as it stood when the sessions landed. Keeping it in the model
    // is what lets the view say "2 hours ago" without reaching for the time
    // itself, which a view is not allowed to do.
    asOf: S.DateTimeUtc,

    // The row currently mid-request, so only its own button says so.
    busy: S.Option(S.String),
    notice: S.Option(AccountNotice),
    problem: S.Option(AccountProblem),
});
export type AccountModel = typeof AccountModel.Type;

export const initialAccount: AccountModel = {
    sessions: Sessions.Idle(),
    accounts: LinkedAccounts.Idle(),
    asOf: DateTime.makeUnsafe(0),
    busy: Option.none(),
    notice: Option.none(),
    problem: Option.none(),
};

/**
 * The account page as entered. Fetched lists are kept from the last visit so
 * they render immediately while enterRoute revalidates them; only the
 * transient row state is cleared. Connecting another provider is a server
 * round trip that lands back here with its outcome in the url, so the page
 * opens saying how it went.
 */
export const enterAccount = (
    link: Option.Option<string>,
    error: Option.Option<string>,
    previous: AccountModel
): AccountModel => {
    const entered: AccountModel = evo(previous, { busy: Option.none, notice: Option.none, problem: Option.none });

    // The callback sets `error` when connecting fell over and `link` when it
    // got far enough to have an outcome, never both.
    if (Option.isSome(error)) {
        return Match.value(classifyOAuthError(error.value)).pipe(
            Match.withReturnType<AccountModel>(),
            Match.when("denied", () => evo(entered, { notice: () => Option.some("linkCancelled" as const) })),
            Match.when("expired", () => evo(entered, { problem: () => Option.some("linkExpired" as const) })),
            Match.when("failed", () => evo(entered, { problem: () => Option.some("linkFailed" as const) })),
            Match.exhaustive
        );
    }

    return Option.match(link, {
        onNone: () => entered,
        onSome: (outcome) =>
            Match.value(outcome).pipe(
                Match.withReturnType<AccountModel>(),
                Match.when("linked", () => evo(entered, { notice: () => Option.some("connected" as const) })),
                Match.when("alreadyLinked", () =>
                    evo(entered, { notice: () => Option.some("alreadyConnected" as const) })
                ),
                Match.when("taken", () => evo(entered, { problem: () => Option.some("accountTaken" as const) })),
                Match.orElse(() => entered)
            ),
    });
};

// MESSAGE

// Fetches settle into a Result; update folds it into the current state with
// `AsyncData.settle`, which keeps held data as Stale on failure.
export const SettledSessions = m("SettledSessions", {
    result: S.Result(S.Array(SessionSummary), LoadFailed),
    asOf: S.DateTimeUtc,
});
export const SettledLinkedAccounts = m("SettledLinkedAccounts", {
    result: S.Result(S.Array(OAuthAccount.json), LoadFailed),
});
export const ClickedRevokeSession = m("ClickedRevokeSession", { sessionId: S.String });
export const ClickedRevokeOthers = m("ClickedRevokeOthers");
export const ClickedRevokeAll = m("ClickedRevokeAll");
export const ClickedUnlink = m("ClickedUnlink", {
    provider: OAuthAccount.fields.provider,
    providerAccountId: S.String,
});
export const CompletedRevoke = m("CompletedRevoke", { revoked: S.Number, signedOut: S.Boolean });
export const CompletedUnlink = m("CompletedUnlink");
export const FailedAction = m("FailedAction", { problem: AccountProblem });

/** The session ended somewhere else while this page was open. */
export const SignedOutElsewhere = m("SignedOutElsewhere");

export const AccountMessage = S.Union([
    SettledSessions,
    SettledLinkedAccounts,
    ClickedRevokeSession,
    ClickedRevokeOthers,
    ClickedRevokeAll,
    ClickedUnlink,
    CompletedRevoke,
    CompletedUnlink,
    FailedAction,
    SignedOutElsewhere,
]);
export type AccountMessage = typeof AccountMessage.Type;

// COMMAND

export const FetchSessions = Command.define("FetchSessions", {
    messages: [SettledSessions, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        const sessions = yield* auth.AuthGroup.sessions();
        return SettledSessions({ result: Result.succeed(sessions), asOf: yield* DateTime.now });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() =>
            Effect.map(DateTime.now, (asOf) => SettledSessions({ result: Result.fail("loadFailed"), asOf }))
        )
    ),
});

export const FetchLinkedAccounts = Command.define("FetchLinkedAccounts", {
    messages: [SettledLinkedAccounts, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        const accounts = yield* auth.AuthGroup.accounts();
        return SettledLinkedAccounts({ result: Result.succeed(accounts) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(SettledLinkedAccounts({ result: Result.fail("loadFailed") })))
    ),
});

export const RevokeSession = Command.define("RevokeSession", {
    args: { sessionId: S.String },
    messages: [CompletedRevoke, FailedAction, SignedOutElsewhere],
    execute: ({ sessionId }) =>
        Effect.gen(function* () {
            const auth = yield* Auth;
            return CompletedRevoke(yield* auth.AuthGroup.revokeSession({ params: { sessionId } }));
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(FailedAction({ problem: "actionFailed" })))
        ),
});

export const RevokeOthers = Command.define("RevokeOthers", {
    messages: [CompletedRevoke, FailedAction, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        return CompletedRevoke(yield* auth.AuthGroup.revokeSessions({ query: { scope: "others" } }));
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(FailedAction({ problem: "actionFailed" })))
    ),
});

export const RevokeAll = Command.define("RevokeAll", {
    messages: [CompletedRevoke, FailedAction, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        return CompletedRevoke(yield* auth.AuthGroup.revokeSessions({ query: { scope: "all" } }));
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(FailedAction({ problem: "actionFailed" })))
    ),
});

export const Unlink = Command.define("Unlink", {
    args: { provider: OAuthAccount.fields.provider, providerAccountId: S.String },
    messages: [CompletedUnlink, FailedAction, SignedOutElsewhere],
    execute: ({ provider, providerAccountId }) =>
        Effect.gen(function* () {
            const auth = yield* Auth;
            yield* auth.AuthGroup.unlinkAccount({ params: { provider, providerAccountId } });
            return CompletedUnlink();
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            // The server refuses to remove the last way in; the button is
            // disabled for it, but a stale page can still ask.
            Effect.catchTag("Conflict", () => Effect.succeed(FailedAction({ problem: "lastSignInMethod" }))),
            Effect.catch(() => Effect.succeed(FailedAction({ problem: "actionFailed" })))
        ),
});

// UPDATE

type AccountStep = readonly [AccountModel, ReadonlyArray<Command.Command<AccountMessage, never, Auth>>];

/** Starting an action clears whatever the last one had to say about itself. */
const starting = (model: AccountModel, busy: string): AccountModel =>
    evo(model, { busy: () => Option.some(busy), notice: Option.none, problem: Option.none });

export const updateAccount = (model: AccountModel, message: AccountMessage): AccountStep =>
    Match.value(message).pipe(
        Match.withReturnType<AccountStep>(),
        Match.tagsExhaustive({
            SettledSessions: ({ asOf, result }) => [
                evo(model, { sessions: AsyncData.settle(result), asOf: () => asOf }),
                [],
            ],
            SettledLinkedAccounts: ({ result }) => [evo(model, { accounts: AsyncData.settle(result) }), []],

            ClickedRevokeSession: ({ sessionId }) => [starting(model, sessionId), [RevokeSession({ sessionId })]],
            ClickedRevokeOthers: () => [starting(model, "others"), [RevokeOthers()]],
            ClickedRevokeAll: () => [starting(model, "all"), [RevokeAll()]],
            ClickedUnlink: ({ provider, providerAccountId }) => [
                starting(model, providerAccountId),
                [Unlink({ provider, providerAccountId })],
            ],

            // A revoke that took this browser's own session with it leaves the
            // page signed out; main.ts sends it on rather than reloading a
            // list nobody is allowed to read any more. Any other mutation
            // refetches, with the held list marked Refreshing while it runs.
            CompletedRevoke: ({ revoked, signedOut }) =>
                signedOut
                    ? [evo(model, { busy: Option.none }), []]
                    : [
                          evo(model, {
                              busy: Option.none,
                              notice: () => Option.some({ revoked }),
                              sessions: (sessions) => Option.getOrElse(AsyncData.revalidate(sessions), () => sessions),
                          }),
                          [FetchSessions()],
                      ],

            CompletedUnlink: () => [
                evo(model, {
                    busy: Option.none,
                    notice: () => Option.some("disconnected" as const),
                    accounts: (accounts) => Option.getOrElse(AsyncData.revalidate(accounts), () => accounts),
                }),
                [FetchLinkedAccounts()],
            ],

            FailedAction: ({ problem }) => [evo(model, { busy: Option.none, problem: () => Option.some(problem) }), []],

            SignedOutElsewhere: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

const card = "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8";

const dangerButton =
    "font-pixel shrink-0 rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-[0.55rem] text-red-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-red-500 disabled:pointer-events-none disabled:opacity-50";

const quietButton =
    "font-pixel shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-[0.6rem] text-gray-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

/**
 * A user agent string is not for reading, so the list shows the two things a
 * visitor actually recognises a session by. Anything unfamiliar keeps its raw
 * string rather than being guessed at and named wrongly.
 */
const describeUserAgent = (msgs: AccountMessages, userAgent: string): string => {
    const browser = /\bEdg\//.test(userAgent)
        ? "Edge"
        : /\bOPR\/|\bOpera\b/.test(userAgent)
          ? "Opera"
          : /\bFirefox\//.test(userAgent)
            ? "Firefox"
            : /\bChrome\/|\bCriOS\//.test(userAgent)
              ? "Chrome"
              : /\bSafari\//.test(userAgent)
                ? "Safari"
                : undefined;

    const platform = /\biPhone\b/.test(userAgent)
        ? "iPhone"
        : /\biPad\b/.test(userAgent)
          ? "iPad"
          : /\bAndroid\b/.test(userAgent)
            ? "Android"
            : /\bMac OS X\b|\bMacintosh\b/.test(userAgent)
              ? "macOS"
              : /\bWindows\b/.test(userAgent)
                ? "Windows"
                : /\bLinux\b/.test(userAgent)
                  ? "Linux"
                  : undefined;

    if (browser !== undefined && platform !== undefined) return msgs.deviceOn(browser, platform);
    return browser ?? platform ?? userAgent;
};

const banner = (h: HtmlBuilder<AppMessage>, tone: "notice" | "problem", text: string): Html =>
    h.p(
        [
            h.Role("status"),
            h.Class(
                tone === "notice"
                    ? "font-mono border-sky-blue bg-sky-light/40 text-sky-dark rounded-lg border-2 px-4 py-3 text-lg"
                    : "font-mono rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-700"
            ),
        ],
        [text]
    );

const sessionRow = (
    h: HtmlBuilder<AppMessage>,
    msgs: AccountMessages,
    language: Language,
    session: SessionSummary,
    model: AccountModel
): Html => {
    const busy = Option.contains(model.busy, session.id);
    const name = Option.match(session.userAgent, {
        onSome: (userAgent) => describeUserAgent(msgs, userAgent),
        onNone: () => msgs.unknownDevice,
    });

    return h.keyed("div")(
        session.id,
        [
            h.Class(
                session.current
                    ? "border-sky-blue bg-sky-light/20 flex flex-wrap items-center gap-3 rounded-lg border-2 p-4"
                    : "flex flex-wrap items-center gap-3 rounded-lg border-2 border-gray-300 bg-white p-4"
            ),
        ],
        [
            h.div(
                [h.Class("min-w-0 flex-1")],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-2")],
                        [
                            h.span([h.Class("font-mono text-xl wrap-break-word text-gray-800")], [name]),
                            session.current
                                ? h.span(
                                      [h.Class("font-pixel bg-sky-dark rounded px-2 py-1 text-[0.5rem] text-white")],
                                      [msgs.thisDevice]
                                  )
                                : h.empty,
                        ]
                    ),
                    h.div(
                        [h.Class("font-mono text-base text-gray-500")],
                        [
                            msgs.lastActive(relativeTime(language, model.asOf, session.lastSeenAt)),
                            ...Option.match(session.ip, {
                                onSome: (ip) => [` · ${ip}`],
                                onNone: () => [],
                            }),
                        ]
                    ),
                    h.div(
                        [h.Class("font-mono text-base text-gray-500")],
                        [msgs.signedInOn(longDate(language, session.createdAt))]
                    ),
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.Class(dangerButton),
                    h.Disabled(busy),
                    h.Title(session.current ? msgs.signOutThisBrowser : msgs.signOutOf(name)),
                    h.OnClick(ClickedRevokeSession({ sessionId: session.id })),
                ],
                [busy ? "..." : msgs.signOut]
            ),
        ]
    );
};

const sessionsSection = (
    h: HtmlBuilder<AppMessage>,
    msgs: AccountMessages,
    language: Language,
    model: AccountModel
): Html => {
    const list = (sessions: ReadonlyArray<SessionSummary>): Html => {
        const others = sessions.filter((session) => !session.current).length;

        return h.div(
            [h.Class("flex flex-col gap-4")],
            [
                ...sessions.map((session) => sessionRow(h, msgs, language, session, model)),
                h.div(
                    [h.Class("flex flex-wrap gap-3 pt-2")],
                    [
                        h.button(
                            [
                                h.Type("button"),
                                h.Class(quietButton),
                                h.Disabled(others === 0 || Option.isSome(model.busy)),
                                h.OnClick(ClickedRevokeOthers()),
                            ],
                            [others === 0 ? msgs.noOtherSessions : msgs.signOutOthers(others)]
                        ),
                        h.button(
                            [
                                h.Type("button"),
                                h.Class(quietButton),
                                h.Disabled(Option.isSome(model.busy)),
                                h.OnClick(ClickedRevokeAll()),
                            ],
                            [msgs.signOutEverywhere]
                        ),
                    ]
                ),
            ]
        );
    };

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.sessionsHeading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.sessionsBody]),
            AsyncData.match(model.sessions, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loadingSessions]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loadingSessions]),
                onFailure: () => h.p([h.Class("font-mono text-xl text-red-700")], [msgs.loadFailed]),
                onRefreshing: list,
                onStale: ({ data }) => list(data),
                onSuccess: list,
            }),
        ]
    );
};

/** The server-owned start of the oauth round trip that connects one more provider. */
const linkHref = (provider: OAuthProviderName): string => `/auth/${provider}/link`;

const providerIcon = (h: HtmlBuilder<AppMessage>, provider: OAuthProviderName): Html =>
    provider === "discord" ? discordIcon(h, "text-discord h-6 w-6 shrink-0") : googleIcon(h, "h-6 w-6 shrink-0");

const providerLabel = (provider: OAuthProviderName): string => (provider === "discord" ? "Discord" : "Google");

const linkedRow = (
    h: HtmlBuilder<AppMessage>,
    msgs: AccountMessages,
    account: LinkedAccount,
    model: AccountModel,
    last: boolean
): Html => {
    const busy = Option.contains(model.busy, account.providerAccountId);
    const detail = Option.orElse(account.email, () => account.displayName);

    return h.keyed("div")(
        `${account.provider}:${account.providerAccountId}`,
        [h.Class("flex flex-wrap items-center gap-3 rounded-lg border-2 border-gray-300 bg-white px-4 py-3")],
        [
            providerIcon(h, account.provider),
            h.div(
                [h.Class("min-w-0 flex-1")],
                [
                    h.div([h.Class("font-mono text-xl text-gray-800")], [providerLabel(account.provider)]),
                    ...Option.match(detail, {
                        onSome: (value) => [
                            h.div([h.Class("font-mono text-base wrap-break-word text-gray-500")], [value]),
                        ],
                        onNone: () => [],
                    }),
                ]
            ),
            // The last way in cannot be removed: doing so would lock the
            // account for good, so the button says why instead of failing.
            h.button(
                [
                    h.Type("button"),
                    h.Class(dangerButton),
                    h.Disabled(busy || last),
                    h.Title(last ? msgs.lastMethodTitle : msgs.disconnectProvider(providerLabel(account.provider))),
                    h.OnClick(
                        ClickedUnlink({
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                        })
                    ),
                ],
                [busy ? "..." : msgs.disconnect]
            ),
        ]
    );
};

const connectRow = (h: HtmlBuilder<AppMessage>, msgs: AccountMessages, provider: OAuthProviderName): Html =>
    h.a(
        [
            h.Href(linkHref(provider)),
            h.Class(
                "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue flex items-center gap-3 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [
            providerIcon(h, provider),
            h.span([h.Class("font-mono text-xl text-gray-800")], [providerLabel(provider)]),
            h.span([h.Class("font-pixel ml-auto shrink-0 text-[0.6rem] text-gray-500")], [msgs.connect]),
        ]
    );

const ALL_PROVIDERS: ReadonlyArray<OAuthProviderName> = ["google", "discord"];

const accountsSection = (h: HtmlBuilder<AppMessage>, msgs: AccountMessages, model: AccountModel): Html => {
    const list = (accounts: ReadonlyArray<LinkedAccount>): Html => {
        const linked = new Set(accounts.map((account) => account.provider));
        const unlinked = ALL_PROVIDERS.filter((provider) => !linked.has(provider));

        return h.div(
            [h.Class("flex flex-col gap-4")],
            [
                ...accounts.map((account) => linkedRow(h, msgs, account, model, accounts.length === 1)),
                ...unlinked.map((provider) => connectRow(h, msgs, provider)),
            ]
        );
    };

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.methodsHeading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.methodsBody]),
            AsyncData.match(model.accounts, {
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

/** A stored notice key (plus any data it carries) turned into this language's copy. */
const noticeText = (msgs: AccountMessages, notice: AccountNotice): string =>
    typeof notice === "string" ? msgs.notices[notice] : msgs.signedOutSessions(notice.revoked);

export const accountView = (
    h: HtmlBuilder<AppMessage>,
    msgs: AccountMessages,
    language: Language,
    model: AccountModel,
    user: SessionUser
): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/towers/@me", msgs.backToTowers),
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.h1([h.Class("font-pixel text-dark-blue text-lg")], [msgs.heading(user.displayName)]),
                    ...Option.match(model.notice, {
                        onSome: (notice) => [banner(h, "notice", noticeText(msgs, notice))],
                        onNone: () => [],
                    }),
                    ...Option.match(model.problem, {
                        onSome: (problem) => [banner(h, "problem", msgs.problems[problem])],
                        onNone: () => [],
                    }),
                    sessionsSection(h, msgs, language, model),
                    accountsSection(h, msgs, model),
                ]
            ),
        ]
    );
