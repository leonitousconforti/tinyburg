import { Array as Arr, Effect, Match, Option, Result, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { TowersMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { type Language, longDate } from "@tinyburg/shared-ui/Internationalization";
import { AsyncData, Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { evo } from "foldkit/struct";

import { Circle, CircleGraph, TowerStatus } from "../../shared/api.ts";
import { GameCatalogEntry, type GameId, GameIds, gamePlayerKey } from "../../shared/games.ts";
import { Self, type SessionInfo } from "../backend.ts";
import { initialLanguage, messagesFor } from "../messages/index.ts";
import { banner, card, dangerButton, primaryButton, quietButton } from "../ui/chrome.ts";
import { GraphLayout, forceGraphLegend, forceGraphView, layout } from "../ui/forceGraph.ts";

type Tower = typeof TowerStatus.Type;

/** Which tower a message is about. A friend code alone would be ambiguous. */
const TowerRef = S.Struct({ game: S.Literals(GameIds), playerId: PlayerIdSchema });
type TowerRef = typeof TowerRef.Type;

// MODEL

export const Towers = AsyncData.Schema(S.Array(TowerStatus), S.String);

export const TowersModel = S.Struct({
    towers: Towers.schema,

    /**
     * The game catalog, served rather than bundled. Names come from here, as
     * does whether a game can be joined at all.
     */
    games: S.Array(GameCatalogEntry),

    /**
     * The laid-out graph. Held rather than derived in the view because the
     * layout is a few hundred iterations of a force simulation, and a render
     * must not pay for that.
     */
    graph: S.Option(GraphLayout),

    // The row currently mid-request, by tower key, so only its own button says so.
    busy: S.Option(S.String),
    notice: S.Option(S.String),
    problem: S.Option(S.String),

    // Withdrawing takes two clicks: the first arms the button, the second acts.
    // Erasure is not undoable, so it should not be one stray tap away.
    armedWithdraw: S.Option(S.String),

    // The circle currently expanded, if any.
    circle: S.Option(Circle),
});
export type TowersModel = typeof TowersModel.Type;

export const initialTowers: TowersModel = {
    towers: Towers.Idle(),
    games: [],
    graph: Option.none(),
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
    SettledGames: { games: S.Array(GameCatalogEntry) },
    SettledGraph: { graph: CircleGraph },

    ClickedEnroll: { tower: TowerRef },
    CompletedEnroll: { crawled: S.Boolean },

    ClickedWithdraw: { tower: TowerRef },
    CompletedWithdraw: { eventsRemoved: S.Finite },

    ClickedCircle: { tower: TowerRef },
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

/**
 * The catalog. Failure is deliberately quiet: without it the page falls back to
 * raw game ids, which is worse but still usable, and a banner about it would
 * push aside problems the visitor can actually act on.
 */
export const FetchGames = Command.define("FetchGames", {
    messages: [TowersMessage.SettledGames],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        return TowersMessage.SettledGames({ games: yield* self.SelfServiceGroup.games() });
    }).pipe(Effect.catch(() => Effect.succeed(TowersMessage.SettledGames({ games: [] })))),
});

export const FetchGraph = Command.define("FetchGraph", {
    messages: [TowersMessage.SettledGraph],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        return TowersMessage.SettledGraph({ graph: yield* self.SelfServiceGroup.graph() });
    }).pipe(Effect.catch(() => Effect.succeed(TowersMessage.SettledGraph({ graph: { nodes: [], edges: [] } })))),
});

const Enroll = Command.define("Enroll", {
    args: { tower: TowerRef },
    messages: [TowersMessage.CompletedEnroll, TowersMessage.FailedAction, TowersMessage.SignedOutElsewhere],
    execute: ({ tower }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const result = yield* self.SelfServiceGroup.enroll({ params: tower });
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
    args: { tower: TowerRef },
    messages: [TowersMessage.CompletedWithdraw, TowersMessage.FailedAction, TowersMessage.SignedOutElsewhere],
    execute: ({ tower }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const receipt = yield* self.SelfServiceGroup.withdraw({ params: tower });
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
    args: { tower: TowerRef },
    messages: [TowersMessage.SettledCircle, TowersMessage.FailedAction, TowersMessage.SignedOutElsewhere],
    execute: ({ tower }) =>
        Effect.gen(function* () {
            const self = yield* Self;
            const circle = yield* self.SelfServiceGroup.circle({ params: tower });
            return TowersMessage.SettledCircle({ circle });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TowersMessage.SignedOutElsewhere())),
            Effect.catch(() => Effect.succeed(TowersMessage.FailedAction({ message: towersMsgs().actionFailed })))
        ),
});

// UPDATE

type TowersStep = readonly [TowersModel, ReadonlyArray<Command.Command<TowersMessage, never, Self>>];

/** Starting an action clears whatever the last one had to say about itself. */
const starting = (model: TowersModel, busy: TowerRef): TowersModel =>
    evo(model, {
        busy: () => Option.some(gamePlayerKey(busy)),
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

            SettledGames: ({ games }) => [evo(model, { games: () => games }), []],

            // The layout runs here, once per answer, rather than in the view.
            SettledGraph: ({ graph }) => [
                evo(model, {
                    graph: () =>
                        graph.nodes.length === 0
                            ? Option.none()
                            : Option.some(layout(graph.nodes, graph.edges, GameIds)),
                }),
                [],
            ],

            ClickedEnroll: ({ tower }) => [starting(model, tower), [Enroll({ tower })]],

            CompletedEnroll: ({ crawled }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    notice: () => Option.some(crawled ? towersMsgs().enrolledCrawled : towersMsgs().enrolledPending),
                }),
                [FetchTowers(), FetchGraph()],
            ],

            // First click arms, second acts. The armed state is per row, so
            // arming one and clicking another does not delete the wrong tower.
            ClickedWithdraw: ({ tower }) =>
                Option.contains(model.armedWithdraw, gamePlayerKey(tower))
                    ? [starting(model, tower), [Withdraw({ tower })]]
                    : [
                          evo(model, {
                              armedWithdraw: () => Option.some(gamePlayerKey(tower)),
                              problem: Option.none,
                          }),
                          [],
                      ],

            CompletedWithdraw: ({ eventsRemoved }) => [
                evo(refetch(model), {
                    busy: Option.none,
                    circle: Option.none,
                    notice: () => Option.some(towersMsgs().withdrawn(eventsRemoved)),
                }),
                [FetchTowers(), FetchGraph()],
            ],

            ClickedCircle: ({ tower }) => [starting(model, tower), [FetchCircle({ tower })]],
            SettledCircle: ({ circle }) => [evo(model, { circle: () => Option.some(circle), busy: Option.none }), []],
            ClickedHideCircle: () => [evo(model, { circle: Option.none }), []],

            FailedAction: ({ message }) => [evo(model, { busy: Option.none, problem: () => Option.some(message) }), []],

            // Handled by main.ts, which owns navigation.
            SignedOutElsewhere: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

/** What to call a game. Falls back to the raw id if the catalog did not load. */
const nameOf = (model: TowersModel, game: GameId): string =>
    model.games.find((entry) => entry.id === game)?.name ?? game;

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
    const key = gamePlayerKey(tower);
    const busy = Option.contains(model.busy, key);
    const armed = Option.contains(model.armedWithdraw, key);
    const showingCircle = Option.match(model.circle, {
        onNone: () => false,
        onSome: (circle) => circle.game === tower.game && circle.playerId === tower.playerId,
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
                                  h.OnClick(TowersMessage.ClickedCircle({ tower })),
                              ],
                              [busy ? "..." : msgs.seeMyCircle]
                          ),
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(dangerButton),
                                  h.Disabled(busy),
                                  h.Title(msgs.withdrawTitle),
                                  h.OnClick(TowersMessage.ClickedWithdraw({ tower })),
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
                                  h.OnClick(TowersMessage.ClickedEnroll({ tower })),
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

/**
 * The graph.
 *
 * Drawn from every game at once rather than one picture per game, because the
 * point of it is the shape of somebody's whole circle. Games separate into their
 * own labelled clusters within the one canvas, since a friendship cannot cross
 * between them.
 */
const graphSection = (h: HtmlBuilder<AppMessage>, msgs: TowersMessages, model: TowersModel): Html => {
    const drawn = Option.match(model.graph, {
        onNone: (): ReadonlyArray<Html> => [h.p([h.Class("font-mono text-lg text-gray-600")], [msgs.graphEmpty])],
        onSome: (graph): ReadonlyArray<Html> => {
            const games = Arr.dedupe(graph.nodes.map((node) => node.game));
            const people = graph.nodes.length;
            const connections = graph.edges.length;

            return [
                ...(games.length > 1 ? [forceGraphLegend(h, games, (game) => nameOf(model, game))] : []),
                h.figure(
                    [h.Class("m-0")],
                    [
                        forceGraphView(h, graph, {
                            nameOf: (game) => nameOf(model, game),
                            description: msgs.graphAlt(people, connections),
                            you: msgs.graphYou,
                        }),
                        h.figcaption(
                            [h.Class("font-mono mt-2 text-center text-base text-gray-500")],
                            [msgs.graphAlt(people, connections)]
                        ),
                    ]
                ),
            ];
        },
    });

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.graphHeading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.graphBody]),
            ...drawn,
        ]
    );
};

const towersSection = (
    h: HtmlBuilder<AppMessage>,
    msgs: TowersMessages,
    language: Language,
    model: TowersModel
): Html => {
    /** One block per game, in catalog order, each headed by the game's name. */
    const byGame = (towers: ReadonlyArray<Tower>): ReadonlyArray<Html> =>
        GameIds.filter((game) => towers.some((tower) => tower.game === game)).map((game) =>
            h.div(
                [h.Class("flex flex-col gap-3")],
                [
                    h.h3([h.Class("font-pixel text-[0.75rem] text-gray-700")], [nameOf(model, game)]),
                    ...towers
                        .filter((tower) => tower.game === game)
                        .map((tower) => towerRow(h, msgs, language, tower, model)),
                ]
            )
        );

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
            : h.div([h.Class("flex flex-col gap-6")], byGame(towers));

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

/**
 * The games the study lists but cannot read yet.
 *
 * Worth saying out loud rather than omitting: somebody who plays Pocket Planes
 * should learn that the study knows the game exists and cannot read it, instead
 * of wondering why their account never appears.
 */
const dormantNote = (h: HtmlBuilder<AppMessage>, msgs: TowersMessages, model: TowersModel): ReadonlyArray<Html> => {
    const dormant = model.games.filter((game) => !game.readable);
    if (dormant.length === 0) return [];

    return [
        h.p(
            [h.Class("font-mono text-center text-base text-white/70")],
            [msgs.dormantGames(dormant.map((game) => game.name).join(", "))]
        ),
    ];
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
                    graphSection(h, msgs, model),
                    towersSection(h, msgs, language, model),
                    ...dormantNote(h, msgs, model),
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
