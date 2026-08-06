import { DateTime, Match, Option, Result, Schema as S, Effect } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { AsyncData, Command } from "foldkit";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { Circle, TowerStatus } from "../../shared/api.ts";
import { Self, type SessionInfo } from "../backend.ts";
import { banner, card, dangerButton, primaryButton, quietButton } from "../ui/chrome.ts";

type Tower = typeof TowerStatus.Type;

// MODEL

export const Towers = AsyncData.Schema(S.Array(TowerStatus), S.String);

export const TowersModel = S.Struct({
    towers: Towers.schema,

    // The row currently mid-request, so only its own button says so.
    busy: S.Option(PlayerIdSchema),
    notice: S.Option(S.String),
    problem: S.Option(S.String),

    // Withdrawing takes two clicks: the first arms the button, the second acts.
    // Erasure is not undoable, so it should not be one stray tap away.
    armedWithdraw: S.Option(PlayerIdSchema),

    // The circle currently expanded, if any.
    circle: S.Option(Circle),
});
export type TowersModel = typeof TowersModel.Type;

export const initialTowers: TowersModel = {
    towers: Towers.Idle(),
    busy: Option.none(),
    notice: Option.none(),
    problem: Option.none(),
    armedWithdraw: Option.none(),
    circle: Option.none(),
};

/** The page as entered: held data stays, transient row state clears. */
export const enterTowers = (previous: TowersModel): TowersModel =>
    evo(previous, {
        busy: Option.none,
        notice: Option.none,
        problem: Option.none,
        armedWithdraw: Option.none,
    });

// MESSAGE

export const SettledTowers = m("SettledTowers", { result: S.Result(S.Array(TowerStatus), S.String) });

export const ClickedEnroll = m("ClickedEnroll", { playerId: PlayerIdSchema });
export const CompletedEnroll = m("CompletedEnroll", { crawled: S.Boolean });

export const ClickedWithdraw = m("ClickedWithdraw", { playerId: PlayerIdSchema });
export const CompletedWithdraw = m("CompletedWithdraw", { eventsRemoved: S.Finite });

export const ClickedCircle = m("ClickedCircle", { playerId: PlayerIdSchema });
export const SettledCircle = m("SettledCircle", { circle: Circle });
export const ClickedHideCircle = m("ClickedHideCircle");

export const FailedAction = m("FailedAction", { message: S.String });

/** The session ended somewhere else while this page was open. */
export const SignedOutElsewhere = m("SignedOutElsewhere");

export const TowersMessage = S.Union([
    SettledTowers,
    ClickedEnroll,
    CompletedEnroll,
    ClickedWithdraw,
    CompletedWithdraw,
    ClickedCircle,
    SettledCircle,
    ClickedHideCircle,
    FailedAction,
    SignedOutElsewhere,
]);
export type TowersMessage = typeof TowersMessage.Type;

// COMMAND

const LOAD_FAILED =
    "We couldn't reach tinyburg.app to check which towers you own. Try signing in again, and if it keeps happening the provider may be down.";
const ACTION_FAILED = "That didn't work. Please try again.";

export const FetchTowers = Command.define("FetchTowers", {
    messages: [SettledTowers, SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const towers = yield* self.SelfServiceGroup.towers();
        return SettledTowers({ result: Result.succeed(towers) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
        Effect.catch(() => Effect.succeed(SettledTowers({ result: Result.fail(LOAD_FAILED) })))
    ),
});

const Enroll = Command.define("Enroll", {
    args: { playerId: PlayerIdSchema },
    messages: [CompletedEnroll, FailedAction, SignedOutElsewhere],
    execute: ({ playerId }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const result = yield* self.SelfServiceGroup.enroll({ params: { playerId } });
            return CompletedEnroll({ crawled: result.crawled });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catchTag("Forbidden", () =>
                Effect.succeed(
                    FailedAction({
                        message:
                            "tinyburg.app could not confirm you own that tower. Make sure it is still linked to your Tinyburg account.",
                    })
                )
            ),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

const Withdraw = Command.define("Withdraw", {
    args: { playerId: PlayerIdSchema },
    messages: [CompletedWithdraw, FailedAction, SignedOutElsewhere],
    execute: ({ playerId }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const receipt = yield* self.SelfServiceGroup.withdraw({ params: { playerId } });
            return CompletedWithdraw({ eventsRemoved: receipt.eventsRemoved });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catchTag("NotFound", () =>
                Effect.succeed(
                    FailedAction({ message: "That tower is not taking part, so there was nothing to remove." })
                )
            ),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

const FetchCircle = Command.define("FetchCircle", {
    args: { playerId: PlayerIdSchema },
    messages: [SettledCircle, FailedAction, SignedOutElsewhere],
    execute: ({ playerId }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const circle = yield* self.SelfServiceGroup.circle({ params: { playerId } });
            return SettledCircle({ circle });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(FailedAction({ message: ACTION_FAILED })))
        ),
});

// UPDATE

type TowersStep = readonly [TowersModel, ReadonlyArray<Command.Command<TowersMessage, never, Self>>];

/** Starting an action clears whatever the last one had to say about itself. */
const starting = (model: TowersModel, busy: typeof PlayerIdSchema.Type): TowersModel =>
    evo(model, {
        busy: () => Option.some(busy),
        notice: Option.none,
        problem: Option.none,
        armedWithdraw: Option.none,
    });

const refetch = (model: TowersModel): TowersModel =>
    evo(model, { towers: (towers) => Option.getOrElse(AsyncData.revalidate(towers), () => towers) });

export const updateTowers = (model: TowersModel, message: TowersMessage): TowersStep =>
    Match.value(message).pipe(
        Match.withReturnType<TowersStep>(),
        Match.tagsExhaustive({
            SettledTowers: ({ result }) => [evo(model, { towers: AsyncData.settle(result), busy: Option.none }), []],

            ClickedEnroll: ({ playerId }) => [starting(model, playerId), [Enroll({ playerId })]],

            CompletedEnroll: ({ crawled }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () =>
                        Option.some(
                            crawled
                                ? "You're taking part. Your circle is below."
                                : "You're taking part. We couldn't read your tower just now, so your circle will appear after the next scheduled pass."
                        ),
                }),
                [FetchTowers()],
            ],

            // First click arms, second acts. The armed state is per row, so
            // arming one and clicking another does not delete the wrong tower.
            ClickedWithdraw: ({ playerId }) =>
                Option.contains(model.armedWithdraw, playerId)
                    ? [starting(model, playerId), [Withdraw({ playerId })]]
                    : [evo(model, { armedWithdraw: () => Option.some(playerId), problem: Option.none }), []],

            CompletedWithdraw: ({ eventsRemoved }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    circle: Option.none,
                    notice: () =>
                        Option.some(
                            `Removed. ${eventsRemoved} record${eventsRemoved === 1 ? "" : "s"} about you were deleted, and you are no longer in the study.`
                        ),
                }),
                [FetchTowers()],
            ],

            ClickedCircle: ({ playerId }) => [starting(model, playerId), [FetchCircle({ playerId })]],
            SettledCircle: ({ circle }) => [evo(model, { circle: () => Option.some(circle), busy: Option.none }), []],
            ClickedHideCircle: () => [evo(model, { circle: Option.none }), []],

            FailedAction: ({ message }) => [evo(model, { busy: Option.none, problem: () => Option.some(message) }), []],

            // Handled by main.ts, which owns navigation.
            SignedOutElsewhere: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

const formatLastCrawled = (tower: Tower): string =>
    Option.match(tower.lastCrawledAt, {
        onNone: () => "not read yet",
        onSome: (when) => `last read ${DateTime.toDateUtc(when).toLocaleDateString()}`,
    });

/**
 * The sampling line.
 *
 * Shown on every enrolled tower rather than buried in the privacy page, because
 * "we kept 4 of your 27 friends" is the single most honest thing the study can
 * say about what its data actually is.
 */
const samplingLine = (h: HtmlBuilder<AppMessage>, tower: Tower): Html =>
    h.p(
        [h.Class("font-mono text-base text-gray-500")],
        [
            tower.totalFriends === 0
                ? `In the study · ${formatLastCrawled(tower)}`
                : `${tower.circleSize} of your ${tower.totalFriends} friends are also taking part · ${formatLastCrawled(tower)}`,
        ]
    );

const circleList = (h: HtmlBuilder<AppMessage>, circle: typeof Circle.Type): Html =>
    h.div(
        [h.Class("mt-3 rounded-lg border-2 border-gray-200 bg-white p-4")],
        [
            h.div(
                [h.Class("mb-3 flex items-center justify-between gap-3")],
                [
                    h.h3([h.Class("font-pixel text-[0.7rem] text-gray-800")], ["Your circle"]),
                    h.button([h.Type("button"), h.Class(quietButton), h.OnClick(ClickedHideCircle())], ["Hide"]),
                ]
            ),
            circle.friends.length === 0
                ? h.p(
                      [h.Class("font-mono text-lg text-gray-600")],
                      [
                          "Nobody in your friends list has joined yet. A connection only appears once both people are taking part.",
                      ]
                  )
                : h.div(
                      [h.Class("flex flex-wrap gap-2")],
                      circle.friends.map((friend) =>
                          h.span(
                              [
                                  h.Class(
                                      "font-mono border-sky-blue bg-sky-light/30 text-sky-dark rounded border-2 px-2 py-1 text-lg"
                                  ),
                              ],
                              [friend]
                          )
                      )
                  ),
        ]
    );

const towerRow = (h: HtmlBuilder<AppMessage>, tower: Tower, model: TowersModel): Html => {
    const busy = Option.contains(model.busy, tower.playerId);
    const armed = Option.contains(model.armedWithdraw, tower.playerId);
    const showingCircle = Option.match(model.circle, {
        onNone: () => false,
        onSome: (circle) => circle.playerId === tower.playerId,
    });

    return h.div(
        [h.Class("flex flex-col gap-3 rounded-lg border-2 border-gray-200 bg-white/70 p-4")],
        [
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-3")],
                [
                    h.span([h.Class("font-pixel text-[0.8rem] text-gray-800")], [tower.playerId]),
                    tower.enrolled
                        ? h.span(
                              [
                                  h.Class(
                                      "font-mono rounded border-2 border-green-300 bg-green-50 px-2 py-1 text-base text-green-700"
                                  ),
                              ],
                              ["Taking part"]
                          )
                        : h.span(
                              [
                                  h.Class(
                                      "font-mono rounded border-2 border-gray-300 bg-gray-50 px-2 py-1 text-base text-gray-600"
                                  ),
                              ],
                              ["Not taking part"]
                          ),
                ]
            ),

            tower.enrolled
                ? samplingLine(h, tower)
                : h.p(
                      [h.Class("font-mono text-base text-gray-500")],
                      [
                          "Joining shares only your friends list, and only connections where the other person has joined too.",
                      ]
                  ),

            h.div(
                [h.Class("flex flex-wrap gap-2")],
                tower.enrolled
                    ? [
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(primaryButton),
                                  h.Disabled(busy),
                                  h.OnClick(ClickedCircle({ playerId: tower.playerId })),
                              ],
                              [busy ? "..." : "See my circle"]
                          ),
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(dangerButton),
                                  h.Disabled(busy),
                                  h.Title("Withdraw and delete everything the study holds about this tower"),
                                  h.OnClick(ClickedWithdraw({ playerId: tower.playerId })),
                              ],
                              [busy ? "..." : armed ? "Really leave and delete?" : "Leave and delete my data"]
                          ),
                      ]
                    : [
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(primaryButton),
                                  h.Disabled(busy),
                                  h.OnClick(ClickedEnroll({ playerId: tower.playerId })),
                              ],
                              [busy ? "Joining..." : "Take part"]
                          ),
                      ]
            ),

            ...(showingCircle
                ? Option.match(model.circle, {
                      onNone: () => [],
                      onSome: (circle) => [circleList(h, circle)],
                  })
                : []),
        ]
    );
};

const towersSection = (h: HtmlBuilder<AppMessage>, model: TowersModel): Html => {
    const list = (towers: ReadonlyArray<Tower>): Html =>
        towers.length === 0
            ? h.div(
                  [h.Class("flex flex-col gap-3")],
                  [
                      h.p(
                          [h.Class("font-mono text-xl text-gray-600")],
                          ["You haven't linked a TinyTower account to your Tinyburg account yet."]
                      ),
                      h.p(
                          [h.Class("font-mono text-lg text-gray-500")],
                          [
                              "Linking is how we know a tower is really yours. ",
                              h.a(
                                  [h.Href("https://tinyburg.app/account/towers"), h.Class("text-sky-dark underline")],
                                  ["Link one at tinyburg.app"]
                              ),
                              ", then come back.",
                          ]
                      ),
                  ]
              )
            : h.div(
                  [h.Class("flex flex-col gap-4")],
                  towers.map((tower) => towerRow(h, tower, model))
              );

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Your Towers"]),
            h.p(
                [h.Class("font-mono mb-6 text-lg text-gray-500")],
                [
                    "Each tower decides for itself. Taking part shares that tower's friends list; leaving erases everything the study holds about it.",
                ]
            ),
            AsyncData.match(model.towers, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your towers..."]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your towers..."]),
                onFailure: (error) => h.p([h.Class("font-mono text-xl text-red-700")], [error]),
                onRefreshing: list,
                onStale: ({ data }) => list(data),
                onSuccess: list,
            }),
        ]
    );
};

export const towersView = (h: HtmlBuilder<AppMessage>, model: TowersModel, session: SessionInfo): Html =>
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
                                        onSome: (name) => `${name}'s social circles`,
                                        onNone: () => "Your social circles",
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
                    towersSection(h, model),
                    h.p(
                        [h.Class("font-mono text-center text-lg text-white/80")],
                        [
                            "What we collect and why is written out on the ",
                            h.a([h.Href("/privacy"), h.Class("text-gold underline")], ["privacy page"]),
                            ".",
                        ]
                    ),
                ]
            ),
        ]
    );
