import { DateTime, Option, Result, Schema as S } from "effect";

import type { SessionUser } from "../../client/backend.ts";
import type { Message as AppMessage } from "../../client/main.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { AsyncData } from "foldkit";
import { Scene } from "foldkit/test";
import { describe, it } from "vitest";

import {
    type AccountModel,
    AccountMessage,
    accountView,
    CompletedRevoke,
    CompletedUnlink,
    enterAccount,
    FailedAction,
    FetchLinkedAccounts,
    FetchSessions,
    initialAccount,
    RevokeAll,
    RevokeOthers,
    RevokeSession,
    SettledLinkedAccounts,
    SettledSessions,
    Unlink,
    updateAccount,
} from "../../client/pages/account.ts";

const { all, click, Command, expect, expectAll, given, role, scene, text, title } = Scene;

// FIXTURES

const user: SessionUser = {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: DateTime.makeUnsafe("2026-01-04T09:00:00Z"),
    lastLoginAt: DateTime.makeUnsafe("2026-08-06T12:00:00Z"),
    displayName: "Dev User",
    avatarUrl: Option.none(),
};

/*
  The view renders "2 hours ago" from `model.asOf` rather than from the clock,
  which is what lets these assertions be exact strings instead of regexes. Every
  fixture below is relative to this instant.
*/
const now = DateTime.makeUnsafe("2026-08-06T12:00:00Z");
const hoursBefore = (hours: number): DateTime.Utc =>
    DateTime.makeUnsafe(DateTime.toEpochMillis(now) - hours * 60 * 60 * 1000);

const CHROME_MACOS =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FIREFOX_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0";

const thisDevice = {
    id: "11111111-1111-4111-8111-111111111111",
    userId: user.id,
    createdAt: hoursBefore(48),
    expiresAt: DateTime.makeUnsafe("2026-09-06T12:00:00Z"),
    lastSeenAt: now,
    userAgent: Option.some(CHROME_MACOS),
    ip: Option.some("203.0.113.7"),
    current: true,
};

const otherDevice = {
    ...thisDevice,
    id: "22222222-2222-4222-8222-222222222222",
    createdAt: hoursBefore(72),
    lastSeenAt: hoursBefore(2),
    userAgent: Option.some(FIREFOX_WINDOWS),
    ip: Option.none(),
    current: false,
};

const googleAccount = {
    userId: user.id,
    provider: "google" as const,
    providerAccountId: "google-1",
    email: Option.some("dev@example.com"),
    displayName: Option.some("Dev User"),
    avatarUrl: Option.none(),
    createdAt: hoursBefore(500),
    lastLoginAt: now,
};

const discordAccount = {
    ...googleAccount,
    provider: "discord" as const,
    providerAccountId: "discord-1",
    email: Option.none(),
    displayName: Option.some("devuser"),
};

type LinkedAccount = typeof googleAccount | typeof discordAccount;

const loaded = (sessions: ReadonlyArray<typeof thisDevice>, accounts: ReadonlyArray<LinkedAccount>): AccountModel => ({
    ...initialAccount,
    asOf: now,
    sessions: AsyncData.succeed(sessions),
    accounts: AsyncData.succeed(accounts),
});

// `main.ts` builds the entered state by handing the previous model to
// `enterAccount` along with whatever the oauth callback put in the url.
const arrivingWith = (link: Option.Option<string>, error: Option.Option<string>): AccountModel =>
    enterAccount(link, error, loaded([thisDevice], [googleAccount, discordAccount]));

/*
  `accountView` renders inside the app's root view, so it takes a builder typed
  to the app-wide Message union, and `HtmlBuilder` is invariant in that
  parameter on purpose: foldkit rejects a builder carried in from another frame
  on exactly this property. Scene infers its Message universe from `update`, so
  the page under test has to declare the app's union and narrow on the way back
  down to the one this module owns.

  The narrowing is a runtime check rather than a cast. Every handler this view
  builds is an AccountMessage today, and if that ever stops being true the test
  says which Message broke it instead of routing it somewhere surprising.
*/
const isAccountMessage = S.is(AccountMessage);

const page = {
    update: (model: AccountModel, message: AppMessage): ReturnType<typeof updateAccount> => {
        if (!isAccountMessage(message)) {
            throw new Error(`the account page dispatched ${message._tag}, which it does not own`);
        }
        return updateAccount(model, message);
    },
    view: (model: AccountModel, h: HtmlBuilder<AppMessage>): Html => accountView(h, model, user),
};

describe("account page", () => {
    describe("arriving back from connecting a provider", () => {
        it("welcomes a freshly connected account", () => {
            scene(
                page,
                given(arrivingWith(Option.some("linked"), Option.none())),
                expect(text("Connected. You can now sign in with it.")).toExist()
            );
        });

        it("treats a cancelled connect as a notice, not a problem", () => {
            scene(
                page,
                given(arrivingWith(Option.none(), Option.some("oauth_denied"))),
                expect(text("Connecting that account was cancelled.")).toExist()
            );
        });

        it("explains a provider account already spoken for", () => {
            scene(
                page,
                given(arrivingWith(Option.some("taken"), Option.none())),
                expect(text("That account is already connected to a different Tinyburg account.")).toExist()
            );
        });

        /*
          The callback is free to invent outcomes this page has not been taught.
          An unknown one has to leave the page as it was rather than falling
          through to a banner with nothing in it.
        */
        it("ignores an outcome it does not recognise rather than blanking the page", () => {
            scene(
                page,
                given(arrivingWith(Option.some("something_new"), Option.none())),
                expect(text("Where You're Signed In")).toExist(),
                expectAll(all.role("status")).toBeEmpty()
            );
        });
    });

    describe("the session list", () => {
        it("names devices from the user agent and marks the current one", () => {
            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount, discordAccount])),
                expect(text("Chrome on macOS")).toExist(),
                expect(text("This device")).toExist(),
                expect(text("Firefox on Windows")).toExist()
            );
        });

        it("reads times against the model's asOf, not the wall clock", () => {
            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount])),
                expect(text("Last active just now · 203.0.113.7")).toExist(),
                expect(text("Last active 2 hours ago")).toExist()
            );
        });

        it("counts other sessions in the bulk button and disables it when there are none", () => {
            scene(
                page,
                given(loaded([thisDevice], [googleAccount])),
                expect(role("button", { name: "No other sessions" })).toBeDisabled()
            );

            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount])),
                expect(role("button", { name: "Sign out 1 other session" })).toBeEnabled()
            );
        });
    });

    describe("revoking a session", () => {
        /*
          Every row carries a button reading "Sign out", so the accessible name
          does not tell them apart; the `title` does, and it is also what a
          screen reader user hears. Targeting by title tests the affordance the
          way it is actually distinguished.
        */
        it("sends the id of the row that was clicked and busies only that row", () => {
            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount])),
                click(title("Sign out of Firefox on Windows")),

                Command.expectExact({ name: "RevokeSession", args: { sessionId: otherDevice.id } }),

                expect(title("Sign out of Firefox on Windows")).toHaveText("..."),
                expect(title("Sign out of Firefox on Windows")).toBeDisabled(),
                expect(title("Sign out of this browser")).toHaveText("Sign out"),
                expect(title("Sign out of this browser")).toBeEnabled(),

                Command.resolveAll(
                    [RevokeSession, CompletedRevoke({ revoked: 1, signedOut: false })],
                    [FetchSessions, SettledSessions({ result: Result.succeed([thisDevice]), asOf: now })]
                ),

                expect(text("Signed out of 1 session.")).toExist(),
                expect(text("Firefox on Windows")).toBeAbsent(),
                expect(role("button", { name: "No other sessions" })).toBeDisabled()
            );
        });

        it("pluralises the confirmation", () => {
            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount])),
                click(role("button", { name: "Sign out 1 other session" })),
                Command.resolveAll(
                    [RevokeOthers, CompletedRevoke({ revoked: 3, signedOut: false })],
                    [FetchSessions, SettledSessions({ result: Result.succeed([thisDevice]), asOf: now })]
                ),
                expect(text("Signed out of 3 sessions.")).toExist()
            );
        });

        /*
          Signing out everywhere takes this browser's own session with it, so
          there is no list left to refetch and nobody to congratulate. `main.ts`
          takes it from here; the page must simply stop.
        */
        it("does not refetch or celebrate when it signed itself out", () => {
            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount])),
                click(role("button", { name: "Sign out everywhere" })),
                Command.resolveAll([RevokeAll, CompletedRevoke({ revoked: 2, signedOut: true })]),
                Command.expectNone(),
                expect(text("Signed out of 2 sessions.")).toBeAbsent()
            );
        });

        it("surfaces a failed revoke and lets the row be tried again", () => {
            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount])),
                click(title("Sign out of Firefox on Windows")),
                Command.resolveAll([RevokeSession, FailedAction({ message: "That didn't work. Please try again." })]),
                expect(text("That didn't work. Please try again.")).toExist(),
                expect(title("Sign out of Firefox on Windows")).toBeEnabled()
            );
        });
    });

    describe("sign-in methods", () => {
        it("offers a connect link for a provider that is not linked yet", () => {
            scene(
                page,
                given(loaded([thisDevice], [googleAccount])),
                expect(role("link", { name: /Discord/ })).toHaveAttr("href", "/auth/discord/link"),
                expect(role("link", { name: /Google/ })).toBeAbsent()
            );
        });

        /*
          Disconnecting the only remaining provider would lock the account out
          for good. The server refuses it too, but the button is the part a
          person meets, and it has to say why rather than just failing.
        */
        it("refuses to disconnect the last way in, and says why", () => {
            scene(
                page,
                given(loaded([thisDevice], [googleAccount])),
                expect(title("This is the only way you have left to sign in")).toBeDisabled()
            );
        });

        it("allows disconnecting once another provider remains", () => {
            scene(
                page,
                given(loaded([thisDevice], [googleAccount, discordAccount])),
                expect(title("Disconnect Google")).toBeEnabled(),
                click(title("Disconnect Google")),

                Command.expectExact({
                    name: "Unlink",
                    args: { provider: "google", providerAccountId: "google-1" },
                }),

                Command.resolveAll(
                    [Unlink, CompletedUnlink()],
                    [FetchLinkedAccounts, SettledLinkedAccounts({ result: Result.succeed([discordAccount]) })]
                ),

                expect(text("Disconnected.")).toExist(),
                expect(title("This is the only way you have left to sign in")).toBeDisabled()
            );
        });
    });

    describe("loading and failure", () => {
        it("says it is loading before anything has landed", () => {
            scene(page, given({ ...initialAccount, asOf: now }), expect(text("Loading your sessions...")).toExist());
        });

        it("shows the failure text in place of the list", () => {
            scene(
                page,
                given({
                    ...initialAccount,
                    asOf: now,
                    sessions: AsyncData.fail("We couldn't load this. Please try again."),
                }),
                expect(text("We couldn't load this. Please try again.")).toExist(),
                expect(role("button", { name: "Sign out everywhere" })).toBeAbsent()
            );
        });

        /*
          A refetch keeps the held list on screen rather than flashing a spinner
          over it, which is the entire reason `CompletedRevoke` marks the list
          Refreshing instead of clearing it.
        */
        it("keeps the current list visible while it refetches", () => {
            scene(
                page,
                given(loaded([thisDevice, otherDevice], [googleAccount])),
                click(role("button", { name: "Sign out 1 other session" })),
                Command.resolveAll([RevokeOthers, CompletedRevoke({ revoked: 1, signedOut: false })]),

                expect(text("Chrome on macOS")).toExist(),
                expect(text("Firefox on Windows")).toExist(),

                Command.resolve(FetchSessions, SettledSessions({ result: Result.succeed([thisDevice]), asOf: now }))
            );
        });
    });
});
