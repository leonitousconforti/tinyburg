import type { Html, HtmlBuilder } from "foldkit/html";

import { appBackLink, card } from "../ui/chrome.ts";

const section = <M>(h: HtmlBuilder<M>, title: string, paragraphs: ReadonlyArray<string>): Html =>
    h.div(
        [h.Class("flex flex-col gap-2")],
        [
            h.h2([h.Class("font-pixel text-[0.8rem] text-gray-800")], [title]),
            ...paragraphs.map((text) => h.p([h.Class("font-mono text-lg text-gray-600")], [text])),
        ]
    );

/**
 * The plain-language version of what the schema enforces.
 *
 * Worth keeping honest rather than reassuring: the sampling caveat below is a
 * real limitation of the dataset, and burying it would make the published
 * numbers look better than they are.
 */
export const privacyView = <M>(h: HtmlBuilder<M>): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/", "← Back to Home"),
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.div(
                        [h.Class(card)],
                        [
                            h.h1([h.Class("font-pixel text-dark-blue mb-6 text-lg")], ["What you'd be sharing"]),
                            h.div(
                                [h.Class("flex flex-col gap-6")],
                                [
                                    section(h, "What we read", [
                                        "Only your friends list, and only for a tower you explicitly joined with. We read it through tinyburg.app, which already holds your linked account, so this study never sees your Nimblebit credentials.",
                                        "Your tower's contents are not part of the study. Bitizens, floors, coins, and bux are none of our business.",
                                    ]),

                                    section(h, "What we store", [
                                        "A connection between two players, and only when both of them have joined. If someone in your friends list has not joined, they are not recorded, not even anonymously.",
                                        "We also store a count: how many friends you had in total, against how many were taking part. That count is what lets an analysis say how much of the real network it is looking at. It names nobody.",
                                    ]),

                                    section(h, "What this dataset actually is", [
                                        "Because a connection needs both people, this is a picture of the network among volunteers, not a picture of TinyTower. Statistics computed on it directly, like how many friends the average player has, will be skewed by who chose to take part.",
                                        "That is a genuine limitation and not something we can fully correct for. It is why the friend counts above are recorded, and why any published analysis should state the sampling rate alongside its results.",
                                    ]),

                                    section(h, "Leaving", [
                                        "Withdrawing removes every record that mentions you: the connections, the history behind them, the counts, and the permission itself. The published views are refreshed as part of the same operation, so you disappear from exports too.",
                                        "Deletion runs as a durable job, which means it finishes even if something crashes partway through, and it records that it completed. It does not quietly half-happen.",
                                    ]),

                                    section(h, "Who can act for you", [
                                        "Only the Tinyburg account that proved it owns a tower can enroll it or withdraw it. Knowing somebody's friend code does not let you take part on their behalf, and it does not let you delete their data either.",
                                    ]),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    );
