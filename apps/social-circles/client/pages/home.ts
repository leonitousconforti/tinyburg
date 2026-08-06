import type { SessionState } from "../backend.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { card, towerIcon } from "../ui/chrome.ts";

const point = <M>(h: HtmlBuilder<M>, title: string, body: string): Html =>
    h.div(
        [h.Class("flex flex-col gap-1")],
        [
            h.h3([h.Class("font-pixel text-[0.7rem] text-gray-800")], [title]),
            h.p([h.Class("font-mono text-lg text-gray-600")], [body]),
        ]
    );

export const homeView = <M>(h: HtmlBuilder<M>, session: SessionState): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 p-8")],
        [
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.div(
                        [h.Class(card)],
                        [
                            h.div(
                                [h.Class("mb-6 flex items-center gap-4")],
                                [
                                    towerIcon(h, "text-dark-blue h-10 w-10 shrink-0"),
                                    h.div(
                                        [],
                                        [
                                            h.h1(
                                                [h.Class("font-pixel text-dark-blue text-lg")],
                                                ["TinyTower Social Circles"]
                                            ),
                                            h.p(
                                                [h.Class("font-mono text-xl text-gray-600")],
                                                ["An opt-in study of how TinyTower players are connected."]
                                            ),
                                        ]
                                    ),
                                ]
                            ),

                            h.div(
                                [h.Class("flex flex-col gap-5")],
                                [
                                    point(
                                        h,
                                        "Nothing without permission",
                                        "Your friends list is never read until you sign in and say yes, for that specific tower. You can stop and erase everything at any time."
                                    ),
                                    point(
                                        h,
                                        "A connection needs both people",
                                        "We only record a friendship when both players have joined. If your friend hasn't, that connection is never stored, not even as a hint."
                                    ),
                                    point(
                                        h,
                                        "No need to friend a bot",
                                        'Older versions of this study needed you to add a bot account. That\'s gone. Permission travels through your Tinyburg account instead, so you can leave "Only Friend Visits" switched on.'
                                    ),
                                ]
                            ),

                            h.div(
                                [h.Class("mt-8 flex flex-wrap gap-3")],
                                [
                                    session._tag === "SignedIn"
                                        ? h.a(
                                              [
                                                  h.Href("/towers"),
                                                  h.Class(
                                                      "bg-dark-blue shadow-pixel hover:shadow-pixel-hover font-pixel rounded-lg px-6 py-4 text-[0.7rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                  ),
                                              ],
                                              ["Your towers →"]
                                          )
                                        : h.a(
                                              [
                                                  h.Href("/login"),
                                                  h.Class(
                                                      "bg-dark-blue shadow-pixel hover:shadow-pixel-hover font-pixel rounded-lg px-6 py-4 text-[0.7rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                  ),
                                              ],
                                              ["Sign in with Tinyburg"]
                                          ),
                                    h.a(
                                        [
                                            h.Href("/privacy"),
                                            h.Class(
                                                "font-pixel shadow-pixel hover:shadow-pixel-hover rounded-lg border-2 border-gray-300 bg-white px-6 py-4 text-[0.7rem] text-gray-700 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                            ),
                                        ],
                                        ["What you'd be sharing"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    );
