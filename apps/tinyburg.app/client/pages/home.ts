import type { HomeMessages, SharedMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

const navLink = <M>(h: HtmlBuilder<M>, href: string, label: string): Html =>
    h.a([h.Href(href), h.Class("hover:text-gold text-xl text-white no-underline transition-colors")], [label]);

const footerLink = <M>(h: HtmlBuilder<M>, href: string, label: string): Html =>
    h.a(
        [h.Href(href), h.Class("hover:text-gold mb-2 block text-lg text-white/90 no-underline transition-colors")],
        [label]
    );

const heroTower = <M>(h: HtmlBuilder<M>, floors: SharedMessages["floors"]): Html =>
    h.div(
        [h.Class("tower tower--hero")],
        [
            h.div([h.Class("floor roof")], ["🏗️"]),
            h.div([h.Class("floor food")], [floors.food]),
            h.div([h.Class("floor retail")], [floors.retail]),
            h.div([h.Class("floor service")], [floors.service]),
            h.div([h.Class("floor creative")], [floors.creative]),
            h.div([h.Class("floor recreation")], [floors.recreation]),
            h.div([h.Class("floor residential")], [floors.residential]),
            h.div([h.Class("floor lobby")], [floors.lobby]),
        ]
    );

export const homeView = <M>(h: HtmlBuilder<M>, msgs: HomeMessages, shared: SharedMessages): Html => {
    const features = [
        { icon: "🏢", ...msgs.features.tradeBitizens },
        { icon: "🎨", ...msgs.features.costumesPets },
        { icon: "🏆", ...msgs.features.goldenTickets },
        { icon: "🤝", ...msgs.features.community },
    ];

    return h.div(
        [],
        [
            h.header(
                [h.Class("bg-dark-blue/95 border-gold sticky top-0 z-50 border-b-4 backdrop-blur-sm")],
                [
                    h.nav(
                        [h.Class("mx-auto flex max-w-6xl items-center justify-between px-8 py-4")],
                        [
                            h.a(
                                [h.Href("/"), h.Class("flex items-center gap-2 text-white no-underline")],
                                [
                                    h.span([h.Class("text-3xl")], ["🏗️"]),
                                    h.span([h.Class("font-pixel text-gold text-xl")], ["Tinyburg"]),
                                ]
                            ),
                            h.div(
                                [h.Class("hidden gap-8 md:flex")],
                                [
                                    navLink(h, "/trades", msgs.nav.browseTrades),
                                    navLink(h, "/bitizens", msgs.nav.bitizens),
                                    navLink(h, "/costumes", msgs.nav.costumes),
                                    navLink(h, "/about", msgs.nav.about),
                                ]
                            ),
                            h.a(
                                [
                                    h.Href("/login"),
                                    h.Class(
                                        "font-pixel bg-gold text-dark-blue shadow-pixel hover:shadow-pixel-hover px-6 py-3 text-[0.7rem] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                    ),
                                ],
                                [msgs.logIn]
                            ),
                        ]
                    ),
                ]
            ),
            h.main(
                [],
                [
                    h.section(
                        [
                            h.Class(
                                "relative z-10 mx-auto grid min-h-[80vh] max-w-6xl grid-cols-1 items-center gap-16 px-8 py-16 lg:grid-cols-2"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("text-center lg:text-left")],
                                [
                                    h.span([h.Class("mb-4 block text-5xl")], ["🏢🏯🏡🏰"]),
                                    h.h1(
                                        [
                                            h.Class(
                                                "font-pixel mb-6 text-2xl leading-relaxed text-white drop-shadow-[4px_4px_0_var(--color-dark-blue)] md:text-4xl"
                                            ),
                                        ],
                                        [msgs.heroTitle]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mb-8 text-2xl leading-relaxed text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
                                            ),
                                        ],
                                        [msgs.heroTagline]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap justify-center gap-4 lg:justify-start")],
                                        [
                                            h.a(
                                                [
                                                    h.Href("/login"),
                                                    h.Class(
                                                        "font-pixel bg-gold text-dark-blue shadow-pixel hover:shadow-pixel-hover px-8 py-4 text-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ffe44d]"
                                                    ),
                                                ],
                                                [msgs.startTrading]
                                            ),
                                            h.a(
                                                [
                                                    h.Href("#features"),
                                                    h.Class(
                                                        "font-pixel shadow-pixel hover:shadow-pixel-hover border-3 border-white bg-transparent px-8 py-4 text-sm text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-white/10"
                                                    ),
                                                ],
                                                [msgs.learnMore]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div([h.Class("flex justify-center")], [heroTower(h, shared.floors)]),
                        ]
                    ),
                    h.section(
                        [h.Id("features"), h.Class("relative z-10 mx-auto max-w-6xl px-8 py-16 text-center")],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "font-pixel mb-12 text-2xl text-white drop-shadow-[3px_3px_0_var(--color-dark-blue)]"
                                    ),
                                ],
                                [msgs.featuresHeading]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4")],
                                features.map((feature) =>
                                    h.div(
                                        [
                                            h.Class(
                                                "bg-card-bg shadow-pixel rounded-lg p-8 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_rgba(0,0,0,0.2)]"
                                            ),
                                        ],
                                        [
                                            h.span([h.Class("mb-4 block text-5xl")], [feature.icon]),
                                            h.h3([h.Class("font-pixel text-dark-blue mb-4 text-sm")], [feature.title]),
                                            h.p(
                                                [h.Class("text-text-dark text-xl leading-relaxed")],
                                                [feature.description]
                                            ),
                                        ]
                                    )
                                )
                            ),
                        ]
                    ),
                    h.section(
                        [h.Class("relative z-10 mx-auto flex max-w-6xl flex-wrap justify-center gap-16 px-8 py-16")],
                        [
                            ["10K+", msgs.stats.activeTraders],
                            ["50K+", msgs.stats.tradesCompleted],
                            ["1M+", msgs.stats.bitizensTraded],
                        ].map(([stat, label]) =>
                            h.div(
                                [
                                    h.Class(
                                        "bg-dark-blue/90 shadow-pixel border-gold rounded-lg border-3 px-12 py-8 text-center"
                                    ),
                                ],
                                [
                                    h.span([h.Class("font-pixel text-gold block text-3xl")], [stat ?? ""]),
                                    h.span([h.Class("mt-2 block text-xl text-white")], [label ?? ""]),
                                ]
                            )
                        )
                    ),
                    h.section(
                        [
                            h.Class(
                                "bg-dark-blue/95 shadow-pixel-hover border-gold relative z-10 mx-auto mb-16 max-w-3xl rounded-2xl border-4 px-8 py-16 text-center"
                            ),
                        ],
                        [
                            h.h2([h.Class("font-pixel text-gold mb-4 text-xl leading-relaxed")], [msgs.ctaHeading]),
                            h.p([h.Class("mb-8 text-2xl text-white")], [msgs.ctaBody]),
                            h.a(
                                [
                                    h.Href("/login"),
                                    h.Class(
                                        "font-pixel bg-gold text-dark-blue shadow-pixel hover:shadow-pixel-hover inline-block px-10 py-5 text-base transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ffe44d]"
                                    ),
                                ],
                                [msgs.ctaButton]
                            ),
                        ]
                    ),
                ]
            ),
            h.footer(
                [h.Class("bg-dark-blue border-gold relative z-10 border-t-4")],
                [
                    h.div(
                        [h.Class("mx-auto grid max-w-6xl grid-cols-1 gap-12 px-8 py-12 md:grid-cols-4")],
                        [
                            h.div(
                                [],
                                [
                                    h.h4([h.Class("font-pixel text-gold mb-4 text-sm")], ["Tinyburg"]),
                                    h.p(
                                        [h.Class("text-lg leading-relaxed text-white/90")],
                                        [
                                            msgs.footerAbout.before,
                                            h.a(
                                                [
                                                    h.Href("https://github.com/leonitousconforti/tinyburg"),
                                                    h.Target("_blank"),
                                                    h.Rel("noopener"),
                                                    h.Class("text-gold hover:underline"),
                                                ],
                                                [msgs.footerAbout.linkLabel]
                                            ),
                                            msgs.footerAbout.after,
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.h4([h.Class("font-pixel text-gold mb-4 text-sm")], [msgs.quickLinks]),
                                    footerLink(h, "/trades", msgs.nav.browseTrades),
                                    footerLink(h, "/bitizens", msgs.nav.bitizens),
                                    footerLink(h, "/costumes", msgs.nav.costumes),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.h4([h.Class("font-pixel text-gold mb-4 text-sm")], [msgs.community]),
                                    footerLink(h, "/discord", "Discord"),
                                    footerLink(h, "/reddit", "Reddit"),
                                    footerLink(h, "/sponsors", msgs.sponsors),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.h4([h.Class("font-pixel text-gold mb-4 text-sm")], [msgs.legal]),
                                    footerLink(h, "/privacy", msgs.privacyPolicy),
                                    footerLink(h, "/terms", msgs.termsOfService),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mx-auto max-w-6xl border-t border-white/10 px-8 py-6 text-center")],
                        [h.p([h.Class("text-base text-white/70")], [msgs.copyright])]
                    ),
                ]
            ),
        ]
    );
};
