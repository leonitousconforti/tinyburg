import { DateTime, Option } from "effect";

import type { Account } from "../auth.ts";
import type { LinkedTowers } from "../backend.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { AsyncData } from "foldkit";

import { appBackLink } from "../ui/chrome.ts";
import { discordIcon, googleIcon } from "../ui/icons.ts";

const card = "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8";

const connectRow = <M>(h: HtmlBuilder<M>, href: string, icon: Html, label: string): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue flex items-center gap-3 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [
            icon,
            h.span([h.Class("font-mono text-xl text-gray-800")], [label]),
            h.span([h.Class("font-pixel ml-auto shrink-0 text-[0.6rem] text-gray-500")], ["Connect →"]),
        ]
    );

const avatar = <M>(h: HtmlBuilder<M>, user: Account): Html =>
    Option.match(user.avatarUrl, {
        onSome: (avatarUrl) =>
            h.img([
                h.Src(avatarUrl),
                h.Alt(`Avatar for ${user.displayName}`),
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
const towerList = <M>(h: HtmlBuilder<M>, towers: LinkedTowers): Html => {
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
            ? empty(
                  "No towers linked yet",
                  "Link your TinyTower save to sync your bitizens and start trading with players worldwide."
              )
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
                                  [
                                      `Linked ${DateTime.format(tower.createdAt, {
                                          locale: "en-US",
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                      })}`,
                                  ]
                              ),
                          ]
                      )
                  )
              );

    return AsyncData.match(towers, {
        onIdle: () => empty("No towers linked yet", "Link your TinyTower save to start trading."),
        onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your towers..."]),
        onFailure: (error) => h.p([h.Class("font-mono text-xl text-red-700")], [error]),
        onRefreshing: linked,
        onStale: ({ data }) => linked(data),
        onSuccess: linked,
    });
};

export const towerMeView = <M>(h: HtmlBuilder<M>, user: Account, towers: LinkedTowers): Html => {
    return h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/", "← Back to Home"),
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.section(
                        [h.Class(card)],
                        [
                            h.div(
                                [h.Class("flex flex-wrap items-center gap-4")],
                                [
                                    avatar(h, user),
                                    h.div(
                                        [h.Class("min-w-0 flex-1")],
                                        [
                                            h.h1(
                                                [h.Class("font-pixel mb-2 text-lg wrap-break-word text-gray-800")],
                                                [user.displayName]
                                            ),
                                            h.p([h.Class("font-mono text-xl text-gray-600")], ["🏙️ Mayor of Tinyburg"]),
                                        ]
                                    ),
                                    h.a(
                                        [
                                            h.Href("/logout"),
                                            h.Class(
                                                "font-pixel bg-dark-blue/80 shadow-pixel hover:shadow-pixel-hover shrink-0 rounded px-4 py-3 text-[0.7rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                            ),
                                        ],
                                        ["Sign Out"]
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
                                    h.h2([h.Class("font-pixel text-lg text-gray-800")], ["My Towers"]),
                                    h.a(
                                        [
                                            h.Href("/towers/@link"),
                                            h.Class(
                                                "bg-gold shadow-pixel hover:shadow-pixel-hover font-pixel shrink-0 rounded-lg px-4 py-3 text-[0.7rem] text-gray-800 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                            ),
                                        ],
                                        ["+ Link a Tower"]
                                    ),
                                ]
                            ),
                            towerList(h, towers),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Sign-In Methods"]),
                            h.p(
                                [h.Class("font-mono mb-6 text-lg text-gray-500")],
                                ["Connect more ways to sign in, so you can always get back to this account."]
                            ),
                            h.div(
                                [h.Class("flex flex-col gap-4")],
                                [
                                    connectRow(h, "/auth/google/login", googleIcon(h, "h-6 w-6 shrink-0"), "Google"),
                                    connectRow(
                                        h,
                                        "/auth/discord/login",
                                        discordIcon(h, "text-discord h-6 w-6 shrink-0"),
                                        "Discord"
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            h.Href("/developers/apps"),
                            h.Class(
                                "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue flex w-full items-center gap-3 rounded-lg border-2 border-gray-300 bg-white p-4 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                            ),
                        ],
                        [
                            h.span([h.Class("text-2xl")], ["🛠️"]),
                            h.div(
                                [h.Class("min-w-0")],
                                [
                                    h.div([h.Class("font-mono text-xl text-gray-800")], ["Developer Portal"]),
                                    h.div(
                                        [h.Class("font-mono text-base text-gray-500")],
                                        ["Register OAuth apps that sign users in with Tinyburg"]
                                    ),
                                ]
                            ),
                            h.span([h.Class("font-pixel ml-auto shrink-0 text-[0.6rem] text-gray-500")], ["→"]),
                        ]
                    ),
                ]
            ),
        ]
    );
};
