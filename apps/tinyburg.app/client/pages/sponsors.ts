import type { SharedMessages, SponsorsMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { articleBackLink, articleHeading } from "../ui/chrome.ts";

interface Sponsor {
    readonly login: string;
    readonly name?: string;
}

// Hardcoded for now, edit these lists to update the page. Avatars and profile
// links are derived from the login, e.g. { login: "octocat", name: "The Octocat" }
const currentSponsors: Array<Sponsor> = [];
const pastSponsors: Array<Sponsor> = [];

const sponsorsUrl = "https://github.com/sponsors/leonitousconforti";
const profileUrl = (sponsor: Sponsor) => `https://github.com/${sponsor.login}`;
const avatarUrl = (sponsor: Sponsor, size: number) => `https://github.com/${sponsor.login}.png?size=${size}`;

const currentSponsorCard = <M>(h: HtmlBuilder<M>, sponsor: Sponsor): Html =>
    h.a(
        [
            h.Href(profileUrl(sponsor)),
            h.Target("_blank"),
            h.Rel("noopener noreferrer"),
            h.Class(
                "shadow-pixel hover:shadow-pixel-hover hover:border-gold flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 text-center no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [
            h.img([
                h.Src(avatarUrl(sponsor, 128)),
                h.Alt(""),
                h.Width("64"),
                h.Height("64"),
                h.Loading("lazy"),
                h.Class("h-16 w-16 rounded-lg"),
            ]),
            h.span([h.Class("font-mono text-xl wrap-break-word text-gray-800")], [sponsor.name ?? sponsor.login]),
        ]
    );

const pastSponsorChip = <M>(h: HtmlBuilder<M>, sponsor: Sponsor): Html =>
    h.a(
        [
            h.Href(profileUrl(sponsor)),
            h.Target("_blank"),
            h.Rel("noopener noreferrer"),
            h.Class(
                "shadow-pixel hover:shadow-pixel-hover flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [
            h.img([
                h.Src(avatarUrl(sponsor, 64)),
                h.Alt(""),
                h.Width("32"),
                h.Height("32"),
                h.Loading("lazy"),
                h.Class("h-8 w-8 rounded"),
            ]),
            h.span([h.Class("font-mono text-lg text-gray-800")], [sponsor.name ?? sponsor.login]),
        ]
    );

export const sponsorsView = <M>(h: HtmlBuilder<M>, msgs: SponsorsMessages, shared: SharedMessages): Html =>
    h.div(
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
                            h.span([h.Class("mb-4 block text-6xl")], ["💖"]),
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
                                    h.p([h.Class("mb-6 text-xl leading-relaxed sm:text-xl")], [msgs.intro]),
                                    h.a(
                                        [
                                            h.Href(sponsorsUrl),
                                            h.Target("_blank"),
                                            h.Rel("noopener noreferrer"),
                                            h.Class(
                                                "font-pixel shadow-pixel hover:shadow-pixel-hover inline-flex items-center gap-2 rounded-lg bg-[#ea4aaa] px-5 py-4 text-[0.65rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#d43a99]"
                                            ),
                                        ],
                                        [h.span([], ["💖"]), ` ${msgs.becomeSponsor}`]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("py-8")],
                                [
                                    articleHeading(h, msgs.currentHeading),
                                    currentSponsors.length === 0
                                        ? h.div(
                                              [
                                                  h.Class(
                                                      "bg-sky-blue/10 border-sky-blue/20 rounded-xl border-2 p-6 text-center"
                                                  ),
                                              ],
                                              [
                                                  h.span([h.Class("mb-3 block text-4xl")], ["🌱"]),
                                                  h.p([h.Class("text-xl leading-relaxed")], [msgs.noSponsors]),
                                              ]
                                          )
                                        : h.div(
                                              [h.Class("grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4")],
                                              currentSponsors.map((sponsor) => currentSponsorCard(h, sponsor))
                                          ),
                                ]
                            ),
                            pastSponsors.length > 0
                                ? h.section(
                                      [h.Class("py-8")],
                                      [
                                          articleHeading(h, msgs.pastHeading),
                                          h.p([h.Class("mb-4 text-xl leading-relaxed")], [msgs.pastBody]),
                                          h.div(
                                              [h.Class("flex flex-wrap gap-3")],
                                              pastSponsors.map((sponsor) => pastSponsorChip(h, sponsor))
                                          ),
                                      ]
                                  )
                                : h.empty,
                            h.section(
                                [h.Class("pt-8")],
                                [
                                    articleHeading(h, msgs.otherWaysHeading),
                                    h.p([h.Class("mb-6 text-xl leading-relaxed")], [msgs.otherWaysBody]),
                                    h.div(
                                        [h.Class("flex flex-col gap-4 md:flex-row")],
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
                                                [h.span([], ["⭐"]), ` ${msgs.starOnGithub}`]
                                            ),
                                            h.a(
                                                [
                                                    h.Href("https://discord.gg/tinyburg"),
                                                    h.Class(
                                                        "bg-discord shadow-pixel hover:shadow-pixel-hover flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-lg text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    ),
                                                ],
                                                [h.span([], ["💬"]), ` ${msgs.joinDiscord}`]
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
