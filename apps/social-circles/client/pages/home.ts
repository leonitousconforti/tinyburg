import type { SessionState } from "../backend.ts";
import type { HomeMessages } from "../messages/types.ts";
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

export const homeView = <M>(h: HtmlBuilder<M>, msgs: HomeMessages, session: SessionState): Html =>
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
                                            h.h1([h.Class("font-pixel text-dark-blue text-lg")], [msgs.title]),
                                            h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.tagline]),
                                        ]
                                    ),
                                ]
                            ),

                            h.div(
                                [h.Class("flex flex-col gap-5")],
                                [
                                    point(h, msgs.permissionTitle, msgs.permissionBody),
                                    point(h, msgs.connectionTitle, msgs.connectionBody),
                                    point(h, msgs.botTitle, msgs.botBody),
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
                                              [msgs.yourTowers]
                                          )
                                        : h.a(
                                              [
                                                  h.Href("/login"),
                                                  h.Class(
                                                      "bg-dark-blue shadow-pixel hover:shadow-pixel-hover font-pixel rounded-lg px-6 py-4 text-[0.7rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                  ),
                                              ],
                                              [msgs.signIn]
                                          ),
                                    h.a(
                                        [
                                            h.Href("/privacy"),
                                            h.Class(
                                                "font-pixel shadow-pixel hover:shadow-pixel-hover rounded-lg border-2 border-gray-300 bg-white px-6 py-4 text-[0.7rem] text-gray-700 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                            ),
                                        ],
                                        [msgs.whatYoudShare]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    );
