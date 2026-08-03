import type { Html, HtmlBuilder } from "foldkit/html";

import { articleBackLink, articleHeading } from "../ui/chrome.ts";
import { githubIcon } from "../ui/icons.ts";

const para = <M>(h: HtmlBuilder<M>, children: ReadonlyArray<Html | string>): Html =>
    h.p([h.Class("mb-4 text-xl leading-relaxed sm:text-xl")], children);

const missionCard = <M>(h: HtmlBuilder<M>, icon: string, title: string, description: string): Html =>
    h.div(
        [h.Class("bg-sky-blue/10 border-sky-blue/20 rounded-xl border-2 p-6 text-center")],
        [
            h.span([h.Class("mb-3 block text-4xl")], [icon]),
            h.h3([h.Class("font-pixel text-dark-blue mb-3 text-[0.65rem] leading-relaxed")], [title]),
            h.p([h.Class("text-lg sm:text-xl")], [description]),
        ]
    );

const step = <M>(h: HtmlBuilder<M>, index: number, title: string, description: string): Html =>
    h.div(
        [h.Class("bg-gold/10 border-gold/30 flex flex-col items-center gap-5 rounded-xl border-2 p-4 md:flex-row")],
        [
            h.span(
                [
                    h.Class(
                        "font-pixel bg-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base text-white"
                    ),
                ],
                [String(index)]
            ),
            h.div(
                [h.Class("text-center md:text-left")],
                [
                    h.h3([h.Class("font-pixel text-dark-blue mb-1 text-[0.65rem]")], [title]),
                    h.p([h.Class("text-lg opacity-85 sm:text-xl")], [description]),
                ]
            ),
        ]
    );

const faq = <M>(h: HtmlBuilder<M>, question: string, answer: ReadonlyArray<Html | string>, last: boolean): Html =>
    h.div(
        [
            h.Class(
                last
                    ? "rounded-lg border-2 border-gray-200 bg-white/50 p-5"
                    : "mb-4 rounded-lg border-2 border-gray-200 bg-white/50 p-5"
            ),
        ],
        [
            h.h3([h.Class("font-pixel text-dark-blue mb-2 text-[0.6rem] leading-relaxed")], [question]),
            h.p([h.Class("text-lg sm:text-xl")], answer),
        ]
    );

export const aboutView = <M>(h: HtmlBuilder<M>): Html =>
    h.div(
        [h.Class("relative min-h-screen px-4 py-16 sm:px-8 sm:py-20")],
        [
            articleBackLink(h, "/", "Back"),
            h.article(
                [h.Class("mx-auto max-w-3xl")],
                [
                    h.header(
                        [
                            h.Class(
                                "border-gold to-sky-light/30 shadow-pixel rounded-t-2xl border-3 border-b-0 bg-linear-to-br from-white p-6 text-center sm:p-10"
                            ),
                        ],
                        [
                            h.span([h.Class("mb-4 block text-6xl")], ["🏗️"]),
                            h.h1(
                                [
                                    h.Class(
                                        "font-pixel text-dark-blue mb-2 text-base leading-relaxed sm:text-lg md:text-xl"
                                    ),
                                ],
                                ["About Tinyburg"]
                            ),
                            h.p(
                                [h.Class("text-text-dark/80 text-xl")],
                                ["Building connections, one bitizen at a time"]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-gold bg-card-bg shadow-pixel-hover divide-y-2 divide-gray-100 rounded-b-2xl border-3 border-t-0 p-6 sm:p-10"
                            ),
                        ],
                        [
                            h.section(
                                [h.Class("pb-8")],
                                [
                                    articleHeading(h, "What is Tinyburg?"),
                                    para(h, [
                                        "Tinyburg is a community-made trading platform built by TinyTower enthusiasts. We make it easy to find dream job bitizens, trade rare costumes, and connect with fellow tower builders from around the world.",
                                    ]),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, "Our Mission"),
                                    h.div(
                                        [h.Class("mt-4 grid grid-cols-1 gap-6 md:grid-cols-3")],
                                        [
                                            missionCard(
                                                h,
                                                "🎯",
                                                "Find Dream Jobbers",
                                                "Stop waiting for random bitizens. Search our database to find the perfect 9-skill dream jobbers for your floors."
                                            ),
                                            missionCard(
                                                h,
                                                "🤝",
                                                "Connect Players",
                                                "Building a tower is more fun together. Connect with thousands of active players ready to trade and help each other out."
                                            ),
                                            missionCard(
                                                h,
                                                "🎨",
                                                "Collect Everything",
                                                "From rare costumes to adorable pets, trade your way to completing your collection."
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, "How It Works"),
                                    h.div(
                                        [h.Class("mt-4 flex flex-col gap-4")],
                                        [
                                            step(
                                                h,
                                                1,
                                                "Sign Up",
                                                "Create your account using Google or Discord in seconds"
                                            ),
                                            step(
                                                h,
                                                2,
                                                "Link Your Tower",
                                                "Use Nimblebit's cloud sync feature to link your tower"
                                            ),
                                            step(
                                                h,
                                                3,
                                                "Browse & Trade",
                                                "Find what you need and connect with other players"
                                            ),
                                            step(
                                                h,
                                                4,
                                                "Build Your Dream Tower",
                                                "Fill every floor with dream jobbers and rare items"
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, "Community First"),
                                    para(h, [
                                        "Tinyburg is built and maintained by passionate TinyTower players. We're not affiliated with NimbleBit, but we share their love for tiny pixels and tall towers. Our goal is to make the TinyTower community even more connected and helpful.",
                                    ]),
                                    h.div(
                                        [h.Class("mt-6 flex flex-col gap-4 md:flex-row")],
                                        [
                                            h.a(
                                                [
                                                    h.Href("https://discord.gg/tinyburg"),
                                                    h.Class(
                                                        "bg-discord shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-lg text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    ),
                                                ],
                                                [h.span([], ["💬"]), " Join our Discord"]
                                            ),
                                            h.a(
                                                [
                                                    h.Href("https://reddit.com/r/tinytower"),
                                                    h.Target("_blank"),
                                                    h.Rel("noopener noreferrer"),
                                                    h.Class(
                                                        "shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg bg-[#ff4500] px-5 py-3 text-lg text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    ),
                                                ],
                                                [h.span([], ["📱"]), " r/tinytower"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, "Open Source"),
                                    para(h, [
                                        "Tinyburg is an open source project. We believe in transparency and community contribution. Check out our code, report bugs, or contribute features on GitHub.",
                                    ]),
                                    h.div(
                                        [h.Class("mt-2 flex flex-col gap-4 md:flex-row")],
                                        [
                                            h.a(
                                                [
                                                    h.Href("https://github.com/leonitousconforti/tinyburg"),
                                                    h.Target("_blank"),
                                                    h.Rel("noopener noreferrer"),
                                                    h.Class(
                                                        "shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg bg-[#24292e] px-5 py-3 text-lg text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#1a1e22]"
                                                    ),
                                                ],
                                                [githubIcon(h, "h-5 w-5"), " View on GitHub"]
                                            ),
                                            h.a(
                                                [
                                                    h.Href("/sponsors"),
                                                    h.Class(
                                                        "shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg bg-[#ea4aaa] px-5 py-3 text-lg text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#d43a99]"
                                                    ),
                                                ],
                                                [h.span([], ["💖"]), " Our Sponsors"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("pt-8")],
                                [
                                    articleHeading(h, "Frequently Asked Questions"),
                                    faq(
                                        h,
                                        "Q: Is Tinyburg free?",
                                        [
                                            "A: Yes! Tinyburg is completely free to use. We're a community project built by players who love the game.",
                                        ],
                                        false
                                    ),
                                    faq(
                                        h,
                                        "Q: Is this affiliated with NimbleBit?",
                                        [
                                            "A: No, Tinyburg is an independent fan project. We're not affiliated with, endorsed by, or connected to NimbleBit LLC in any way.",
                                        ],
                                        false
                                    ),
                                    faq(
                                        h,
                                        "Q: How do trades work?",
                                        [
                                            "A: Tinyburg helps you find traders and coordinate exchanges. The actual trading can leverage a couple different methods to exchange the items depending on what the items are, such as sending gifts or modifying save data.",
                                        ],
                                        false
                                    ),
                                    faq(
                                        h,
                                        "Is my data safe?",
                                        [
                                            "We only collect what's necessary to provide the service. Check our ",
                                            h.a(
                                                [
                                                    h.Href("/privacy"),
                                                    h.Class(
                                                        "text-sky-dark decoration-sky-dark/30 hover:decoration-sky-dark underline decoration-2 underline-offset-2 transition-colors"
                                                    ),
                                                ],
                                                ["Privacy Policy"]
                                            ),
                                            " for full details.",
                                        ],
                                        true
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    );
