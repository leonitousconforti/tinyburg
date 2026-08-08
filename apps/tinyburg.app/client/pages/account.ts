import { DateTime, Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

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

export const Sessions = AsyncData.Schema(S.Array(SessionSummary), S.String);
export const LinkedAccounts = AsyncData.Schema(S.Array(OAuthAccount.json), S.String);

export const AccountModel = S.Struct({
    sessions: Sessions.schema,
    accounts: LinkedAccounts.schema,

    // The clock as it stood when the sessions landed. Keeping it in the model
    // is what lets the view say "2 hours ago" without reaching for the time
    // itself, which a view is not allowed to do.
    asOf: S.DateTimeUtc,

    // The row currently mid-request, so only its own button says so.
    busy: S.Option(S.String),
    notice: S.Option(S.String),
    problem: S.Option(S.String),
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
            Match.when("denied", () =>
                evo(entered, { notice: () => Option.some("Connecting that account was cancelled.") })
            ),
            Match.when("expired", () =>
                evo(entered, {
                    problem: () => Option.some("That attempt expired or was interrupted. Please try connecting again."),
                })
            ),
            Match.when("failed", () =>
                evo(entered, { problem: () => Option.some("We couldn't connect that account. Please try again.") })
            ),
            Match.exhaustive
        );
    }

    return Option.match(link, {
        onNone: () => entered,
        onSome: (outcome) =>
            Match.value(outcome).pipe(
                Match.withReturnType<AccountModel>(),
                Match.when("linked", () =>
                    evo(entered, { notice: () => Option.some("Connected. You can now sign in with it.") })
                ),
                Match.when("alreadyLinked", () =>
                    evo(entered, { notice: () => Option.some("That account was already connected.") })
                ),
                Match.when("taken", () =>
                    evo(entered, {
                        problem: () =>
                            Option.some("That account is already connected to a different Tinyburg account."),
                    })
                ),
                Match.orElse(() => entered)
            ),
    });
};

// MESSAGE

// Fetches settle into a Result; update folds it into the current state with
// `AsyncData.settle`, which keeps held data as Stale on failure.
export const SettledSessions = m("SettledSessions", {
    result: S.Result(S.Array(SessionSummary), S.String),
    asOf: S.DateTimeUtc,
});
export const SettledLinkedAccounts = m("SettledLinkedAccounts", {
    result: S.Result(S.Array(OAuthAccount.json), S.String),
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
export const FailedAction = m("FailedAction", { message: S.String });

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

const LOAD_FAILED = "We couldn't load this. Please try again.";
const ACTION_FAILED = "That didn't work. Please try again.";

export const FetchSessions = Command.define("FetchSessions", {
    messages: [SettledSessions, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        const sessions = yield* auth.AuthGroup.sessions();
        return SettledSessions({ result: Result.succeed(sessions), asOf: yield* DateTime.now });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() =>
            Effect.map(DateTime.now, (asOf) => SettledSessions({ result: Result.fail(LOAD_FAILED), asOf }))
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
        Effect.catch(() => Effect.succeed(SettledLinkedAccounts({ result: Result.fail(LOAD_FAILED) })))
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
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

export const RevokeOthers = Command.define("RevokeOthers", {
    messages: [CompletedRevoke, FailedAction, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        return CompletedRevoke(yield* auth.AuthGroup.revokeSessions({ query: { scope: "others" } }));
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
    ),
});

export const RevokeAll = Command.define("RevokeAll", {
    messages: [CompletedRevoke, FailedAction, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        return CompletedRevoke(yield* auth.AuthGroup.revokeSessions({ query: { scope: "all" } }));
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
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
            Effect.catchTag("Conflict", () =>
                Effect.succeed(
                    FailedAction({ message: "That's your only way to sign in, so it has to stay connected." })
                )
            ),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
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
                              notice: () =>
                                  Option.some(
                                      revoked === 1 ? "Signed out of 1 session." : `Signed out of ${revoked} sessions.`
                                  ),
                              sessions: (sessions) => Option.getOrElse(AsyncData.revalidate(sessions), () => sessions),
                          }),
                          [FetchSessions()],
                      ],

            CompletedUnlink: () => [
                evo(model, {
                    busy: Option.none,
                    notice: () => Option.some("Disconnected."),
                    accounts: (accounts) => Option.getOrElse(AsyncData.revalidate(accounts), () => accounts),
                }),
                [FetchLinkedAccounts()],
            ],

            FailedAction: ({ message }) => [evo(model, { busy: Option.none, problem: () => Option.some(message) }), []],

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
const describeUserAgent = (userAgent: string): string => {
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

    if (browser !== undefined && platform !== undefined) return `${browser} on ${platform}`;
    return browser ?? platform ?? userAgent;
};

const relative = (asOf: DateTime.Utc, when: DateTime.Utc): string => {
    const seconds = Math.round((DateTime.toEpochMillis(asOf) - DateTime.toEpochMillis(when)) / 1000);
    if (seconds < 90) return "just now";

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;

    const days = Math.round(hours / 24);
    if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;

    return DateTime.format(when, { locale: "en-US", month: "long", day: "numeric", year: "numeric" });
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

const sessionRow = (h: HtmlBuilder<AppMessage>, session: SessionSummary, model: AccountModel): Html => {
    const busy = Option.contains(model.busy, session.id);
    const name = Option.match(session.userAgent, {
        onSome: describeUserAgent,
        onNone: () => "Unknown device",
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
                                      ["This device"]
                                  )
                                : h.empty,
                        ]
                    ),
                    h.div(
                        [h.Class("font-mono text-base text-gray-500")],
                        [
                            `Last active ${relative(model.asOf, session.lastSeenAt)}`,
                            ...Option.match(session.ip, {
                                onSome: (ip) => [` · ${ip}`],
                                onNone: () => [],
                            }),
                        ]
                    ),
                    h.div(
                        [h.Class("font-mono text-base text-gray-500")],
                        [
                            `Signed in ${DateTime.format(session.createdAt, {
                                locale: "en-US",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}`,
                        ]
                    ),
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.Class(dangerButton),
                    h.Disabled(busy),
                    h.Title(session.current ? "Sign out of this browser" : `Sign out of ${name}`),
                    h.OnClick(ClickedRevokeSession({ sessionId: session.id })),
                ],
                [busy ? "..." : "Sign out"]
            ),
        ]
    );
};

const sessionsSection = (h: HtmlBuilder<AppMessage>, model: AccountModel): Html => {
    const list = (sessions: ReadonlyArray<SessionSummary>): Html => {
        const others = sessions.filter((session) => !session.current).length;

        return h.div(
            [h.Class("flex flex-col gap-4")],
            [
                ...sessions.map((session) => sessionRow(h, session, model)),
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
                            [
                                others === 0
                                    ? "No other sessions"
                                    : others === 1
                                      ? "Sign out 1 other session"
                                      : `Sign out ${others} other sessions`,
                            ]
                        ),
                        h.button(
                            [
                                h.Type("button"),
                                h.Class(quietButton),
                                h.Disabled(Option.isSome(model.busy)),
                                h.OnClick(ClickedRevokeAll()),
                            ],
                            ["Sign out everywhere"]
                        ),
                    ]
                ),
            ]
        );
    };

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Where You're Signed In"]),
            h.p(
                [h.Class("font-mono mb-6 text-lg text-gray-500")],
                ["Every browser holding a session for this account. Sign out of any you don't recognise."]
            ),
            AsyncData.match(model.sessions, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your sessions..."]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your sessions..."]),
                onFailure: (error) => h.p([h.Class("font-mono text-xl text-red-700")], [error]),
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

const linkedRow = (h: HtmlBuilder<AppMessage>, account: LinkedAccount, model: AccountModel, last: boolean): Html => {
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
                    h.Title(
                        last
                            ? "This is the only way you have left to sign in"
                            : `Disconnect ${providerLabel(account.provider)}`
                    ),
                    h.OnClick(
                        ClickedUnlink({
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                        })
                    ),
                ],
                [busy ? "..." : "Disconnect"]
            ),
        ]
    );
};

const connectRow = (h: HtmlBuilder<AppMessage>, provider: OAuthProviderName): Html =>
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
            h.span([h.Class("font-pixel ml-auto shrink-0 text-[0.6rem] text-gray-500")], ["Connect →"]),
        ]
    );

const ALL_PROVIDERS: ReadonlyArray<OAuthProviderName> = ["google", "discord"];

const accountsSection = (h: HtmlBuilder<AppMessage>, model: AccountModel): Html => {
    const list = (accounts: ReadonlyArray<LinkedAccount>): Html => {
        const linked = new Set(accounts.map((account) => account.provider));
        const unlinked = ALL_PROVIDERS.filter((provider) => !linked.has(provider));

        return h.div(
            [h.Class("flex flex-col gap-4")],
            [
                ...accounts.map((account) => linkedRow(h, account, model, accounts.length === 1)),
                ...unlinked.map((provider) => connectRow(h, provider)),
            ]
        );
    };

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Sign-In Methods"]),
            h.p(
                [h.Class("font-mono mb-6 text-lg text-gray-500")],
                ["Connect more ways to sign in, so you can always get back to this account."]
            ),
            AsyncData.match(model.accounts, {
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

export const accountView = (h: HtmlBuilder<AppMessage>, model: AccountModel, user: SessionUser): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/towers/@me", "← Back to My Towers"),
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.h1([h.Class("font-pixel text-dark-blue text-lg")], [`${user.displayName}'s account`]),
                    ...Option.match(model.notice, {
                        onSome: (text) => [banner(h, "notice", text)],
                        onNone: () => [],
                    }),
                    ...Option.match(model.problem, {
                        onSome: (text) => [banner(h, "problem", text)],
                        onNone: () => [],
                    }),
                    sessionsSection(h, model),
                    accountsSection(h, model),
                ]
            ),
        ]
    );
