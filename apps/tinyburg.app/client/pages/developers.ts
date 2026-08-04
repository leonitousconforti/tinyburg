import type { Html, HtmlBuilder } from "foldkit/html";

import { articleBackLink, articleHeading } from "../ui/chrome.ts";

// Endpoint urls always advertise the public site, matching the old
// server-rendered page which built them from the configured site origin.
const site = "https://tinyburg.app";

const endpoints = [
    { name: "JWKS", url: `${site}/.well-known/jwks.json` },
    { name: "Discovery", url: `${site}/.well-known/openid-configuration` },
    { name: "Authorization", url: `${site}/oauth/authorize` },
    { name: "Token", url: `${site}/oauth/token` },
    { name: "Userinfo", url: `${site}/oauth/userinfo` },
];

const scopes = [
    { name: "openid", description: "Confirm your Tinyburg identity" },
    { name: "profile", description: "See your display name and avatar" },
];

const steps = [
    {
        title: "Log In to Tinyburg",
        description: "You need a Tinyburg account to register applications",
    },
    {
        title: "Register Your Application",
        description: "Give it a name and your redirect uris, then grab your client id and secret",
    },
    {
        title: "Point Your OIDC Library at Us",
        description: "Most libraries only need the discovery url below to configure themselves",
    },
    {
        title: "Players Sign In",
        description: "They approve your app once and arrive back at your redirect uri",
    },
];

const featureCard = <M>(h: HtmlBuilder<M>, icon: string, title: string, description: string): Html =>
    h.div(
        [h.Class("bg-sky-blue/10 border-sky-blue/20 rounded-xl border-2 p-6 text-center")],
        [
            h.span([h.Class("mb-3 block text-4xl")], [icon]),
            h.h3([h.Class("font-pixel text-dark-blue mb-3 text-[0.65rem] leading-relaxed")], [title]),
            h.p([h.Class("text-lg sm:text-xl")], [description]),
        ]
    );

export const developersView = <M>(h: HtmlBuilder<M>): Html =>
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
                            h.span([h.Class("mb-4 block text-6xl")], ["🛠️"]),
                            h.h1(
                                [
                                    h.Class(
                                        "font-pixel text-dark-blue mb-2 text-base leading-relaxed sm:text-lg md:text-xl"
                                    ),
                                ],
                                ["Tinyburg for Developers"]
                            ),
                            h.p(
                                [h.Class("text-text-dark/80 text-xl")],
                                ["Let players bring their Tinyburg account to your app"]
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
                                    articleHeading(h, "Sign in with Tinyburg"),
                                    h.p(
                                        [h.Class("mb-4 text-xl leading-relaxed sm:text-xl")],
                                        [
                                            "Tinyburg is an OpenID Connect provider. Building a companion tool, a Discord bot dashboard, or anything else for the TinyTower community? Register an OAuth application and players can sign in to it with the same account they use to trade, no new passwords required.",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mt-6 grid grid-cols-1 gap-6 md:grid-cols-3")],
                                        [
                                            featureCard(
                                                h,
                                                "🔐",
                                                "Standard OIDC",
                                                "Authorization code flow with PKCE and ES256-signed id tokens. Any OpenID Connect client library works out of the box."
                                            ),
                                            featureCard(
                                                h,
                                                "🪶",
                                                "Minimal Scopes",
                                                "Apps only see a player's identity, display name, and avatar. Nothing else leaves Tinyburg."
                                            ),
                                            featureCard(
                                                h,
                                                "🤝",
                                                "Player Consent",
                                                "Players approve exactly what your app can see on a consent screen before any tokens are issued."
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, "Getting Started"),
                                    h.div(
                                        [h.Class("mt-4 flex flex-col gap-4")],
                                        steps.map((step, index) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "bg-gold/10 border-gold/30 flex flex-col items-center gap-5 rounded-xl border-2 p-4 md:flex-row"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "font-pixel bg-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base text-white"
                                                            ),
                                                        ],
                                                        [String(index + 1)]
                                                    ),
                                                    h.div(
                                                        [h.Class("text-center md:text-left")],
                                                        [
                                                            h.h3(
                                                                [
                                                                    h.Class(
                                                                        "font-pixel text-dark-blue mb-1 text-[0.65rem]"
                                                                    ),
                                                                ],
                                                                [step.title]
                                                            ),
                                                            h.p(
                                                                [h.Class("text-lg opacity-85 sm:text-xl")],
                                                                [step.description]
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                                    h.p(
                                        [h.Class("mt-6 text-xl leading-relaxed sm:text-xl")],
                                        [
                                            "Redirect uris must use https, except for localhost while you develop. Client secrets are shown once at registration and stored hashed, so keep yours somewhere safe.",
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, "Endpoints"),
                                    h.p(
                                        [h.Class("mb-4 text-xl leading-relaxed sm:text-xl")],
                                        [
                                            "Everything below is also published in the discovery document, so most setups only ever need the first url.",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-col gap-3")],
                                        endpoints.map((endpoint) =>
                                            h.div(
                                                [h.Class("rounded-lg border-2 border-gray-200 bg-white/50 p-4")],
                                                [
                                                    h.div(
                                                        [h.Class("font-pixel text-dark-blue mb-2 text-[0.55rem]")],
                                                        [endpoint.name]
                                                    ),
                                                    h.code(
                                                        [
                                                            h.Class(
                                                                "font-mono text-base break-all text-gray-600 sm:text-lg"
                                                            ),
                                                        ],
                                                        [endpoint.url]
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, "Scopes"),
                                    h.div(
                                        [h.Class("flex flex-col gap-3")],
                                        scopes.map((scope) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex flex-col gap-1 rounded-lg border-2 border-gray-200 bg-white/50 p-4 sm:flex-row sm:items-center sm:gap-4"
                                                    ),
                                                ],
                                                [
                                                    h.code(
                                                        [h.Class("font-mono text-lg text-gray-800 sm:text-xl")],
                                                        [scope.name]
                                                    ),
                                                    h.span(
                                                        [h.Class("text-lg text-gray-600 sm:text-xl")],
                                                        [scope.description]
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("pt-8")],
                                [
                                    articleHeading(h, "Ready to Build?"),
                                    h.p(
                                        [h.Class("mb-4 text-xl leading-relaxed sm:text-xl")],
                                        [
                                            "Register your first application and start signing players in. Questions or stuck on something? Ask in the ",
                                            h.a(
                                                [
                                                    h.Href("https://discord.gg/tinyburg"),
                                                    h.Class(
                                                        "text-sky-dark decoration-sky-dark/30 hover:decoration-sky-dark underline decoration-2 underline-offset-2 transition-colors"
                                                    ),
                                                ],
                                                ["Tinyburg Discord"]
                                            ),
                                            " and we'll help you out.",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mt-6 flex flex-col gap-4 md:flex-row")],
                                        [
                                            h.a(
                                                [
                                                    h.Href("/developers/apps"),
                                                    h.Class(
                                                        "font-pixel bg-gold shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg px-5 py-4 text-[0.7rem] text-gray-800 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    ),
                                                ],
                                                ["Your Applications"]
                                            ),
                                            h.a(
                                                [
                                                    h.Href(endpoints[0]?.url ?? site),
                                                    h.Class(
                                                        "font-pixel bg-dark-blue/95 shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg px-5 py-4 text-[0.7rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    ),
                                                ],
                                                ["Discovery Document"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    );
