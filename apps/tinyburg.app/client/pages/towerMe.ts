import { type DateTime, Option } from "effect";

import type { LinkedTowers, SessionUser } from "../backend.ts";
import type { SharedMessages, TowerMeMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { type Language, longDate } from "@tinyburg/ui/Internationalization";
import { AsyncData } from "foldkit";

import { appBackLink } from "../ui/chrome.ts";

const card = "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8";

/** A full-width row that leads somewhere else in the account. */
const navRow = <M>(h: HtmlBuilder<M>, href: string, emoji: string, title: string, detail: string): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue flex w-full items-center gap-3 rounded-lg border-2 border-gray-300 bg-white p-4 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [
            h.span([h.Class("text-2xl"), h.AriaHidden(true)], [emoji]),
            h.div(
                [h.Class("min-w-0")],
                [
                    h.div([h.Class("font-mono text-xl text-gray-800")], [title]),
                    h.div([h.Class("font-mono text-base text-gray-500")], [detail]),
                ]
            ),
            h.span([h.Class("font-pixel ml-auto shrink-0 text-[0.6rem] text-gray-500")], ["→"]),
        ]
    );

const avatar = <M>(h: HtmlBuilder<M>, msgs: TowerMeMessages, user: SessionUser): Html =>
    Option.match(user.avatarUrl, {
        onSome: (avatarUrl) =>
            h.img([
                h.Src(avatarUrl),
                h.Alt(msgs.avatarAlt(user.displayName)),
                h.Referrerpolicy("no-referrer"),
                h.Class("h-16 w-16 shrink-0 rounded-lg border-2 border-gray-300 bg-white object-cover"),
            ]),
        onNone: () =>
            h.div(
                [
                    h.AriaHidden(true),
                    h.Class(
                        "bg-sky-blue font-pixel flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-gray-300 text-2xl text-white"
                    ),
                ],
                [user.displayName.charAt(0).toUpperCase() || "?"]
            ),
    });

/** The linked towers section, driven by the trading api. */
const towerList = <M>(h: HtmlBuilder<M>, msgs: TowerMeMessages, language: Language, towers: LinkedTowers): Html => {
    const empty = (message: string, detail: string): Html =>
        h.div(
            [h.Class("rounded-lg border-2 border-dashed border-gray-300 p-8 text-center")],
            [
                h.div([h.Class("mb-3 text-4xl")], ["🏗️"]),
                h.p([h.Class("font-mono mb-1 text-2xl text-gray-600")], [message]),
                h.p([h.Class("font-mono text-lg text-gray-500")], [detail]),
            ]
        );

    const linked = (data: ReadonlyArray<{ readonly playerId: string; readonly createdAt: DateTime.Utc }>): Html =>
        data.length === 0
            ? empty(msgs.noTowers, msgs.noTowersDetailLong)
            : h.div(
                  [h.Class("flex flex-col gap-4")],
                  data.map((tower) =>
                      h.keyed("div")(
                          tower.playerId,
                          [h.Class("rounded-lg border-2 border-gray-300 bg-white p-4")],
                          [
                              h.div([h.Class("font-mono text-2xl tracking-[0.2em] text-gray-800")], [tower.playerId]),
                              h.div(
                                  [h.Class("font-mono text-base text-gray-500")],
                                  [msgs.linkedOn(longDate(language, tower.createdAt))]
                              ),
                          ]
                      )
                  )
              );

    return AsyncData.match(towers, {
        onIdle: () => empty(msgs.noTowers, msgs.noTowersDetailShort),
        onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loadingTowers]),
        onFailure: () => h.p([h.Class("font-mono text-xl text-red-700")], [msgs.towersLoadFailed]),
        onRefreshing: linked,
        onStale: ({ data }) => linked(data),
        onSuccess: linked,
    });
};

export const towerMeView = <M>(
    h: HtmlBuilder<M>,
    msgs: TowerMeMessages,
    shared: SharedMessages,
    language: Language,
    user: SessionUser,
    towers: LinkedTowers
): Html => {
    return h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/", shared.backToHome),
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.section(
                        [h.Class(card)],
                        [
                            h.div(
                                [h.Class("flex flex-wrap items-center gap-4")],
                                [
                                    avatar(h, msgs, user),
                                    h.div(
                                        [h.Class("min-w-0 flex-1")],
                                        [
                                            h.h1(
                                                [h.Class("font-pixel mb-2 text-lg wrap-break-word text-gray-800")],
                                                [user.displayName]
                                            ),
                                            h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.mayor]),
                                        ]
                                    ),
                                    // A native form because signing out is a POST: the
                                    // browser submits, the server revokes and answers
                                    // with a redirect home.
                                    h.form(
                                        [
                                            h.Attribute("method", "post"),
                                            h.Attribute("action", "/logout"),
                                            h.Class("shrink-0"),
                                        ],
                                        [
                                            h.button(
                                                [
                                                    h.Type("submit"),
                                                    h.Class(
                                                        "font-pixel bg-dark-blue/80 shadow-pixel hover:shadow-pixel-hover cursor-pointer rounded px-4 py-3 text-[0.7rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    ),
                                                ],
                                                [msgs.signOut]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            h.div(
                                [h.Class("mb-6 flex items-center justify-between gap-4")],
                                [
                                    h.h2([h.Class("font-pixel text-lg text-gray-800")], [msgs.towersHeading]),
                                    h.a(
                                        [
                                            h.Href("/towers/@link"),
                                            h.Class(
                                                "bg-gold shadow-pixel hover:shadow-pixel-hover font-pixel shrink-0 rounded-lg px-4 py-3 text-[0.7rem] text-gray-800 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                            ),
                                        ],
                                        [msgs.linkATower]
                                    ),
                                ]
                            ),
                            towerList(h, msgs, language, towers),
                        ]
                    ),
                    navRow(h, "/account", "🔐", msgs.accountRow.title, msgs.accountRow.detail),
                    navRow(h, "/developers/apps", "🛠️", msgs.developerRow.title, msgs.developerRow.detail),
                ]
            ),
        ]
    );
};
