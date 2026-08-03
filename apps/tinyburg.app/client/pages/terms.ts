import type { Html, HtmlBuilder } from "foldkit/html";

import { articleBackLink, articleHeading, bullet } from "../ui/chrome.ts";
import { discordServerLink } from "./privacy.ts";

const para = <M>(h: HtmlBuilder<M>, className: string, children: ReadonlyArray<Html | string>): Html =>
    h.p([h.Class(className)], children);

const section = <M>(
    h: HtmlBuilder<M>,
    position: "first" | "middle" | "last",
    title: string,
    children: ReadonlyArray<Html | string>
): Html =>
    h.section(
        [h.Class(position === "first" ? "pb-6 sm:pb-8" : position === "last" ? "pt-6 sm:pt-8" : "py-6 sm:py-8")],
        [articleHeading(h, title), ...children]
    );

const bullets = <M>(h: HtmlBuilder<M>, className: string, items: ReadonlyArray<ReadonlyArray<Html | string>>): Html =>
    h.ul(
        [h.Class(className)],
        items.map((item) => bullet(h, item))
    );

export const termsView = <M>(h: HtmlBuilder<M>): Html =>
    h.div(
        [h.Class("relative min-h-screen px-4 py-16 sm:px-8 sm:py-20")],
        [
            articleBackLink(h, "/", "Home"),
            h.article(
                [h.Class("mx-auto max-w-3xl")],
                [
                    h.header(
                        [
                            h.Class(
                                "border-gold to-sky-light/30 shadow-pixel rounded-t-2xl border-3 border-b-0 bg-linear-to-br from-white p-6 sm:p-10"
                            ),
                        ],
                        [
                            h.h1(
                                [h.Class("font-pixel text-dark-blue text-sm leading-relaxed sm:text-lg md:text-xl")],
                                ["Terms of Service"]
                            ),
                            h.p([h.Class("text-text-dark/60 mt-3 text-lg")], ["Last updated: January 28, 2026"]),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-gold bg-card-bg shadow-pixel-hover divide-y-2 divide-gray-100 rounded-b-2xl border-3 border-t-0 p-6 sm:p-10"
                            ),
                        ],
                        [
                            section(h, "first", "1. Acceptance of Terms", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    'By accessing or using Tinyburg ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.',
                                ]),
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "You must be at least 13 years old to use the Service. By using the Service, you represent that you meet this age requirement.",
                                ]),
                            ]),
                            section(h, "middle", "2. Description of Service", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "Tinyburg is a community-driven platform that facilitates trading of in-game items, bitizens, costumes, and other virtual goods between players of TinyTower, a mobile game developed by NimbleBit LLC.",
                                ]),
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "All trades involve virtual goods within TinyTower. These items have no real-world monetary value, and Tinyburg does not facilitate any exchange of real currency between users.",
                                ]),
                                h.div(
                                    [h.Class("border-gold bg-gold/10 rounded-lg border-l-4 p-4")],
                                    [
                                        para(h, "text-lg leading-relaxed sm:text-xl", [
                                            h.strong([h.Class("text-dark-blue")], ["Disclaimer:"]),
                                            " Tinyburg is an independent fan project and is not affiliated with, endorsed by, or connected to NimbleBit LLC in any way. TinyTower and related marks are trademarks of NimbleBit LLC.",
                                        ]),
                                    ]
                                ),
                            ]),
                            section(h, "middle", "3. User Accounts", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "To use certain features of the Service, you must create an account using Google or Discord authentication. You are responsible for:",
                                ]),
                                bullets(h, "space-y-2 pl-1", [
                                    ["Maintaining the security of your account"],
                                    ["All activities that occur under your account"],
                                    ["Ensuring your account information is accurate"],
                                ]),
                            ]),
                            section(h, "middle", "4. User Conduct", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", ["You agree not to:"]),
                                bullets(h, "space-y-2 pl-1", [
                                    ["Use the Service for any unlawful purpose"],
                                    ["Harass, abuse, or harm other users"],
                                    ["Attempt to scam or defraud other users in trades"],
                                    ["Impersonate other users or entities"],
                                    ["Interfere with the proper functioning of the Service"],
                                    ["Use automated systems to access the Service without permission"],
                                ]),
                            ]),
                            section(h, "middle", "5. Trading", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "Tinyburg facilitates connections between players for trading purposes. We act solely as an intermediary platform and do not participate in trades directly. Users trade at their own risk.",
                                ]),
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "Tinyburg is not responsible for:",
                                ]),
                                bullets(h, "mb-4 space-y-2 pl-1", [
                                    ["Failed, incomplete, or delayed trades"],
                                    ["Misrepresentation of items or user identity"],
                                    ["Any losses of virtual items incurred through trading"],
                                    ["Technical issues within TinyTower that affect trades"],
                                    ["Actions taken by NimbleBit regarding your TinyTower account"],
                                ]),
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "We encourage users to verify trade details before confirming and to report any suspicious activity to our moderation team.",
                                ]),
                            ]),
                            section(h, "middle", "6. Intellectual Property", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "The Service and its original content, features, and functionality are owned by Tinyburg and are protected by applicable laws. TinyTower and related game content are the property of NimbleBit LLC.",
                                ]),
                            ]),
                            section(h, "middle", "7. Termination", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "We reserve the right to terminate or suspend your account at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.",
                                ]),
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "Upon termination, your right to use the Service will immediately cease. You may request your data by contacting us before account deletion.",
                                ]),
                            ]),
                            section(h, "middle", "8. Dispute Resolution", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "For disputes between users regarding trades, we encourage resolution through direct communication. Our moderation team may assist but cannot enforce resolutions or recover lost virtual items.",
                                ]),
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "Any disputes with Tinyburg itself shall be resolved through informal negotiation. Contact us via Discord to address concerns before taking any other action.",
                                ]),
                            ]),
                            section(h, "middle", "9. Disclaimer of Warranties", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    'The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, secure, or error-free.',
                                ]),
                            ]),
                            section(h, "middle", "10. Limitation of Liability", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "To the maximum extent permitted by law, Tinyburg shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.",
                                ]),
                            ]),
                            section(h, "middle", "11. Changes to Terms", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.",
                                ]),
                            ]),
                            section(h, "last", "12. Contact", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "If you have questions about these Terms, please reach out through our ",
                                    discordServerLink(h),
                                    ".",
                                ]),
                            ]),
                        ]
                    ),
                ]
            ),
        ]
    );
