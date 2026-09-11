import type { DevelopersMessages, SharedMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { all as gameScopes } from "@tinyburg/trading-sdk/Scopes";

import { articleBackLink, articleHeading } from "../ui/chrome.ts";

// Endpoint urls always advertise the public site, matching the old
// server-rendered page which built them from the configured site origin.
const site = "https://tinyburg.app";

const endpointUrls = {
    jwks: `${site}/.well-known/jwks.json`,
    discovery: `${site}/.well-known/openid-configuration`,
    authorization: `${site}/oauth/authorize`,
    token: `${site}/oauth/token`,
    userinfo: `${site}/oauth/userinfo`,
};

const featureCard = <M>(h: HtmlBuilder<M>, icon: string, title: string, description: string): Html =>
    h.div(
        [h.Class("bg-sky-blue/10 border-sky-blue/20 rounded-xl border-2 p-6 text-center")],
        [
            h.span([h.Class("mb-3 block text-4xl")], [icon]),
            h.h3([h.Class("font-pixel text-dark-blue mb-3 text-[0.65rem] leading-relaxed")], [title]),
            h.p([h.Class("text-lg sm:text-xl")], [description]),
        ]
    );

export const developersView = <M>(h: HtmlBuilder<M>, msgs: DevelopersMessages, shared: SharedMessages): Html => {
    const endpoints = [
        { name: msgs.endpointNames.jwks, url: endpointUrls.jwks },
        { name: msgs.endpointNames.discovery, url: endpointUrls.discovery },
        { name: msgs.endpointNames.authorization, url: endpointUrls.authorization },
        { name: msgs.endpointNames.token, url: endpointUrls.token },
        { name: msgs.endpointNames.userinfo, url: endpointUrls.userinfo },
    ];

    // The OIDC scopes in the visitor's language; the game scopes as the api
    // that enforces them describes them, which is the same tree the consent
    // screen reads, so a developer sees exactly the words a player will.
    const scopes = [
        { name: "openid", description: msgs.scopeDescriptions.openid },
        { name: "profile", description: msgs.scopeDescriptions.profile },
        ...gameScopes(),
    ];

    const steps = [msgs.steps.logIn, msgs.steps.register, msgs.steps.point, msgs.steps.signIn];

    return h.div(
        [h.Class("relative min-h-screen px-4 py-16 sm:px-8 sm:py-20")],
        [
            articleBackLink(h, "/", shared.back),
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
                                [msgs.title]
                            ),
                            h.p([h.Class("text-text-dark/80 text-xl")], [msgs.tagline]),
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
                                    articleHeading(h, msgs.signInHeading),
                                    h.p([h.Class("mb-4 text-xl leading-relaxed sm:text-xl")], [msgs.signInBody]),
                                    h.div(
                                        [h.Class("mt-6 grid grid-cols-1 gap-6 md:grid-cols-3")],
                                        [
                                            featureCard(
                                                h,
                                                "🔐",
                                                msgs.features.standardOidc.title,
                                                msgs.features.standardOidc.description
                                            ),
                                            featureCard(
                                                h,
                                                "🪶",
                                                msgs.features.minimalScopes.title,
                                                msgs.features.minimalScopes.description
                                            ),
                                            featureCard(
                                                h,
                                                "🤝",
                                                msgs.features.playerConsent.title,
                                                msgs.features.playerConsent.description
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, msgs.gettingStartedHeading),
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
                                    h.p([h.Class("mt-6 text-xl leading-relaxed sm:text-xl")], [msgs.redirectNote]),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, msgs.endpointsHeading),
                                    h.p([h.Class("mb-4 text-xl leading-relaxed sm:text-xl")], [msgs.endpointsBody]),
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
                                    articleHeading(h, msgs.scopesHeading),
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
                                    articleHeading(h, msgs.readyHeading),
                                    h.p(
                                        [h.Class("mb-4 text-xl leading-relaxed sm:text-xl")],
                                        [
                                            msgs.readyBefore,
                                            h.a(
                                                [
                                                    h.Href("https://discord.gg/tinyburg"),
                                                    h.Class(
                                                        "text-sky-dark decoration-sky-dark/30 hover:decoration-sky-dark underline decoration-2 underline-offset-2 transition-colors"
                                                    ),
                                                ],
                                                [msgs.discordLinkLabel]
                                            ),
                                            msgs.readyAfter,
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
                                                [msgs.yourApplications]
                                            ),
                                            h.a(
                                                [
                                                    // Kept pointing at the first listed endpoint, as before.
                                                    h.Href(endpointUrls.jwks),
                                                    h.Class(
                                                        "font-pixel bg-dark-blue/95 shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg px-5 py-4 text-[0.7rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    ),
                                                ],
                                                [msgs.discoveryDocument]
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
};
