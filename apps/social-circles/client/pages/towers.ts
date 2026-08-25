import { Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { TowersMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { type Language, longDate } from "@tinyburg/ui/Internationalization";
import { AsyncData, Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { evo } from "foldkit/struct";

import { Circle, TowerStatus } from "../../shared/api.ts";
import { Self, type SessionInfo } from "../backend.ts";
import { initialLanguage, messagesFor } from "../messages/index.ts";
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

/**
 * Everything this page can say.
 *
 * `defineMessageUnion` declares the union and its constructors together, so a
 * variant cannot be added without joining the union or removed while something
 * still matches on it.
 */
export const TowersMessage = defineMessageUnion({
    SettledTowers: { result: S.Result(S.Array(TowerStatus), S.String) },

    ClickedEnroll: { playerId: PlayerIdSchema },
    CompletedEnroll: { crawled: S.Boolean },

    ClickedWithdraw: { playerId: PlayerIdSchema },
    CompletedWithdraw: { eventsRemoved: S.Finite },

    ClickedCircle: { playerId: PlayerIdSchema },
    SettledCircle: { circle: Circle },
    ClickedHideCircle: {},

    FailedAction: { message: S.String },

    /** The session ended somewhere else while this page was open. */
    SignedOutElsewhere: {},
});
export type TowersMessage = typeof TowersMessage.Type;

// COMMAND

// The language is decided once at init and never changes (no switcher), so
// commands and update may resolve the text they put into the model directly
// from `initialLanguage` rather than threading it through the runtime.
const towersMsgs = (): TowersMessages => messagesFor(initialLanguage).towers;

export const FetchTowers = Command.define("FetchTowers", {
    messages: [TowersMessage.SettledTowers, TowersMessage.SignedOutElsewhere],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const towers = yield* self.SelfServiceGroup.towers();
        return TowersMessage.SettledTowers({ result: Result.succeed(towers) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(TowersMessage.SignedOutElsewhere())),
        Effect.catch(() =>
            Effect.succeed(TowersMessage.SettledTowers({ result: Result.fail(towersMsgs().loadFailed) }))
        )
    ),
});

const Enroll = Command.define("Enroll", {
    args: { playerId: PlayerIdSchema },
    messages: [TowersMessage.CompletedEnroll, TowersMessage.FailedAction, TowersMessage.SignedOutElsewhere],
    execute: ({ playerId }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const result = yield* self.SelfServiceGroup.enroll({ params: { playerId } });
            return TowersMessage.CompletedEnroll({ crawled: result.crawled });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TowersMessage.SignedOutElsewhere())),
            Effect.catchTag("Forbidden", () =>
                Effect.succeed(TowersMessage.FailedAction({ message: towersMsgs().enrollForbidden }))
            ),
            Effect.catch(() => Effect.succeed(TowersMessage.FailedAction({ message: towersMsgs().actionFailed })))
        ),
});

const Withdraw = Command.define("Withdraw", {
    args: { playerId: PlayerIdSchema },
    messages: [TowersMessage.CompletedWithdraw, TowersMessage.FailedAction, TowersMessage.SignedOutElsewhere],
    execute: ({ playerId }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const receipt = yield* self.SelfServiceGroup.withdraw({ params: { playerId } });
            return TowersMessage.CompletedWithdraw({ eventsRemoved: receipt.eventsRemoved });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TowersMessage.SignedOutElsewhere())),
            Effect.catchTag("NotFound", () =>
                Effect.succeed(TowersMessage.FailedAction({ message: towersMsgs().withdrawNotFound }))
            ),
            Effect.catch(() => Effect.succeed(TowersMessage.FailedAction({ message: towersMsgs().actionFailed })))
        ),
});

const FetchCircle = Command.define("FetchCircle", {
    args: { playerId: PlayerIdSchema },
    messages: [TowersMessage.SettledCircle, TowersMessage.FailedAction, TowersMessage.SignedOutElsewhere],
    execute: ({ playerId }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const circle = yield* self.SelfServiceGroup.circle({ params: { playerId } });
            return TowersMessage.SettledCircle({ circle });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TowersMessage.SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(TowersMessage.FailedAction({ message: towersMsgs().actionFailed })))
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
                    notice: () => Option.some(crawled ? towersMsgs().enrolledCrawled : towersMsgs().enrolledPending),
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
                    notice: () => Option.some(towersMsgs().withdrawn(eventsRemoved)),
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

const formatLastCrawled = (msgs: TowersMessages, language: Language, tower: Tower): string =>
    Option.match(tower.lastCrawledAt, {
        onNone: () => msgs.notReadYet,
        onSome: (when) => msgs.lastRead(longDate(language, when)),
    });

/**
 * The sampling line.
 *
 * Shown on every enrolled tower rather than buried in the privacy page, because
 * "we kept 4 of your 27 friends" is the single most honest thing the study can
 * say about what its data actually is.
 */
const samplingLine = (h: HtmlBuilder<AppMessage>, msgs: TowersMessages, language: Language, tower: Tower): Html =>
    h.p(
        [h.Class("font-mono text-base text-gray-500")],
        [
            tower.totalFriends === 0
                ? msgs.inTheStudy(formatLastCrawled(msgs, language, tower))
                : msgs.circleSummary(tower.circleSize, tower.totalFriends, formatLastCrawled(msgs, language, tower)),
        ]
    );

const circleList = (h: HtmlBuilder<AppMessage>, msgs: TowersMessages, circle: typeof Circle.Type): Html =>
    h.div(
        [h.Class("mt-3 rounded-lg border-2 border-gray-200 bg-white p-4")],
        [
            h.div(
                [h.Class("mb-3 flex items-center justify-between gap-3")],
                [
                    h.h3([h.Class("font-pixel text-[0.7rem] text-gray-800")], [msgs.yourCircle]),
                    h.button(
                        [h.Type("button"), h.Class(quietButton), h.OnClick(TowersMessage.ClickedHideCircle())],
                        [msgs.hide]
                    ),
                ]
            ),
            circle.friends.length === 0
                ? h.p([h.Class("font-mono text-lg text-gray-600")], [msgs.emptyCircle])
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

const towerRow = (
    h: HtmlBuilder<AppMessage>,
    msgs: TowersMessages,
    language: Language,
    tower: Tower,
    model: TowersModel
): Html => {
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
                              [msgs.takingPart]
                          )
                        : h.span(
                              [
                                  h.Class(
                                      "font-mono rounded border-2 border-gray-300 bg-gray-50 px-2 py-1 text-base text-gray-600"
                                  ),
                              ],
                              [msgs.notTakingPart]
                          ),
                ]
            ),

            tower.enrolled
                ? samplingLine(h, msgs, language, tower)
                : h.p([h.Class("font-mono text-base text-gray-500")], [msgs.joiningShares]),

            h.div(
                [h.Class("flex flex-wrap gap-2")],
                tower.enrolled
                    ? [
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(primaryButton),
                                  h.Disabled(busy),
                                  h.OnClick(TowersMessage.ClickedCircle({ playerId: tower.playerId })),
                              ],
                              [busy ? "..." : msgs.seeMyCircle]
                          ),
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(dangerButton),
                                  h.Disabled(busy),
                                  h.Title(msgs.withdrawTitle),
                                  h.OnClick(TowersMessage.ClickedWithdraw({ playerId: tower.playerId })),
                              ],
                              [busy ? "..." : armed ? msgs.reallyLeave : msgs.leaveAndDelete]
                          ),
                      ]
                    : [
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(primaryButton),
                                  h.Disabled(busy),
                                  h.OnClick(TowersMessage.ClickedEnroll({ playerId: tower.playerId })),
                              ],
                              [busy ? msgs.joining : msgs.takePart]
                          ),
                      ]
            ),

            ...(showingCircle
                ? Option.match(model.circle, {
                      onNone: () => [],
                      onSome: (circle) => [circleList(h, msgs, circle)],
                  })
                : []),
        ]
    );
};

const towersSection = (
    h: HtmlBuilder<AppMessage>,
    msgs: TowersMessages,
    language: Language,
    model: TowersModel
): Html => {
    const list = (towers: ReadonlyArray<Tower>): Html =>
        towers.length === 0
            ? h.div(
                  [h.Class("flex flex-col gap-3")],
                  [
                      h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.noLinkedTowers]),
                      h.p(
                          [h.Class("font-mono text-lg text-gray-500")],
                          [
                              msgs.linkingExplains,
                              h.a(
                                  [h.Href("https://tinyburg.app/account/towers"), h.Class("text-sky-dark underline")],
                                  [msgs.linkOne]
                              ),
                              msgs.thenComeBack,
                          ]
                      ),
                  ]
              )
            : h.div(
                  [h.Class("flex flex-col gap-4")],
                  towers.map((tower) => towerRow(h, msgs, language, tower, model))
              );

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.heading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.headingBody]),
            AsyncData.match(model.towers, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onFailure: (error) => h.p([h.Class("font-mono text-xl text-red-700")], [error]),
                onRefreshing: list,
                onStale: ({ data }) => list(data),
                onSuccess: list,
            }),
        ]
    );
};

export const towersView = (
    h: HtmlBuilder<AppMessage>,
    msgs: TowersMessages,
    language: Language,
    model: TowersModel,
    session: SessionInfo
): Html =>
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
                                        onSome: (name) => msgs.namedSocialCircles(name),
                                        onNone: () => msgs.yourSocialCircles,
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
                        onSome: (text) => [banner(h, "notice", text)],
                        onNone: () => [],
                    }),
                    ...Option.match(model.problem, {
                        onSome: (text) => [banner(h, "problem", text)],
                        onNone: () => [],
                    }),
                    towersSection(h, msgs, language, model),
                    h.p(
                        [h.Class("font-mono text-center text-lg text-white/80")],
                        [
                            msgs.privacyPrefix,
                            h.a([h.Href("/privacy"), h.Class("text-gold underline")], [msgs.privacyLink]),
                            msgs.privacySuffix,
                        ]
                    ),
                ]
            ),
        ]
    );
