import type { Html, HtmlBuilder } from "foldkit/html";

import { articleBackLink, articleHeading, bullet } from "../ui/chrome.ts";
import { externalLinkIcon } from "../ui/icons.ts";

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

const subheading = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.h3([h.Class("text-dark-blue mt-4 mb-3 text-lg font-bold sm:text-xl")], [text]);

const bullets = <M>(h: HtmlBuilder<M>, className: string, items: ReadonlyArray<ReadonlyArray<Html | string>>): Html =>
    h.ul(
        [h.Class(className)],
        items.map((item) => bullet(h, item))
    );

const strong = <M>(h: HtmlBuilder<M>, text: string): Html => h.strong([h.Class("text-dark-blue")], [text]);

const discordServerLink = <M>(h: HtmlBuilder<M>): Html =>
    h.a(
        [
            h.Href("https://discord.gg/tinyburg"),
            h.Target("_blank"),
            h.Rel("noopener noreferrer"),
            h.Class(
                "text-discord decoration-discord/30 hover:decoration-discord inline-flex items-center gap-1 font-semibold underline decoration-2 underline-offset-2 transition-colors"
            ),
        ],
        ["community Discord server", externalLinkIcon(h, "size-4")]
    );

export const privacyView = <M>(h: HtmlBuilder<M>): Html =>
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
                                ["Privacy Policy"]
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
                            section(h, "first", "1. Introduction", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    'This Privacy Policy explains how Tinyburg ("we", "us", or "our") collects, uses, shares, and protects your information when you use our trading platform for TinyTower players.',
                                ]),
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "By using Tinyburg, you consent to the practices described in this policy. We encourage you to read this document carefully.",
                                ]),
                            ]),
                            section(h, "middle", "2. Information We Collect", [
                                subheading(h, "2.1 Account Information"),
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "When you sign in using Google or Discord, we receive:",
                                ]),
                                bullets(h, "mb-6 space-y-2 pl-1", [
                                    ["Your display name or username"],
                                    ["Your email address"],
                                    ["Your profile picture (if available)"],
                                    ["Your unique account identifier from the provider"],
                                ]),
                                subheading(h, "2.2 TinyTower Information"),
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "If you choose to link your TinyTower account, we may collect:",
                                ]),
                                bullets(h, "mb-6 space-y-2 pl-1", [
                                    ["Your TinyTower friend code"],
                                    ["Your tower data (floors, bitizens, etc.)"],
                                    ["Trading history within our platform"],
                                ]),
                                subheading(h, "2.3 Usage Information"),
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", ["We automatically collect:"]),
                                bullets(h, "mb-6 space-y-2 pl-1", [
                                    ["Pages visited and features used"],
                                    ["Time and date of visits"],
                                    ["Device type and browser information"],
                                    ["IP address (for security and fraud prevention)"],
                                ]),
                            ]),
                            section(h, "middle", "3. How We Use Your Information", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "We use collected information to:",
                                ]),
                                bullets(h, "space-y-2 pl-1", [
                                    ["Provide and maintain the Service"],
                                    ["Facilitate trades between users"],
                                    ["Display your profile to other traders"],
                                    ["Send important service updates"],
                                    ["Improve and optimize the Service"],
                                    ["Prevent fraud and abuse"],
                                ]),
                            ]),
                            section(h, "middle", "4. Information Sharing", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "We do not sell your personal information. We may share information:",
                                ]),
                                bullets(h, "space-y-3 pl-1", [
                                    [
                                        strong(h, "With other users:"),
                                        " Your display name, profile picture, and trading information are visible to facilitate trades",
                                    ],
                                    [strong(h, "For legal reasons:"), " When required by law or to protect our rights"],
                                    [
                                        strong(h, "With service providers:"),
                                        " Third parties that help us operate the Service (hosting, analytics)",
                                    ],
                                ]),
                            ]),
                            section(h, "middle", "5. Data Security", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "We implement appropriate security measures to protect your information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.",
                                ]),
                            ]),
                            section(h, "middle", "6. Data Retention", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "We retain your information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time.",
                                ]),
                            ]),
                            section(h, "middle", "7. Your Rights", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", ["You have the right to:"]),
                                bullets(h, "space-y-2 pl-1", [
                                    ["Access your personal information"],
                                    ["Correct inaccurate information"],
                                    ["Delete your account and data"],
                                    ["Export your data"],
                                    ["Opt out of non-essential communications"],
                                ]),
                            ]),
                            section(h, "middle", "8. Cookies and Local Storage", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "We use the following technologies:",
                                ]),
                                bullets(h, "mb-4 space-y-3 pl-1", [
                                    [strong(h, "Session cookies:"), " To keep you logged in"],
                                    [strong(h, "Preference cookies:"), " To remember your settings"],
                                    [strong(h, "Local storage:"), " To cache tower data for performance"],
                                ]),
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "We do not use advertising or tracking cookies. All cookies are essential for the Service to function.",
                                ]),
                            ]),
                            section(h, "middle", "9. Third-Party Services", [
                                para(h, "mb-4 text-lg leading-relaxed sm:text-xl", [
                                    "Our Service uses Google and Discord for authentication. Please review their respective privacy policies:",
                                ]),
                                bullets(h, "space-y-2 pl-1", [
                                    [
                                        h.a(
                                            [
                                                h.Href("https://policies.google.com/privacy"),
                                                h.Target("_blank"),
                                                h.Rel("noopener noreferrer"),
                                                h.Class(
                                                    "text-google decoration-google/30 hover:decoration-google font-semibold underline decoration-2 underline-offset-2 transition-colors"
                                                ),
                                            ],
                                            ["Google Privacy Policy"]
                                        ),
                                    ],
                                    [
                                        h.a(
                                            [
                                                h.Href("https://discord.com/privacy"),
                                                h.Target("_blank"),
                                                h.Rel("noopener noreferrer"),
                                                h.Class(
                                                    "text-discord decoration-discord/30 hover:decoration-discord font-semibold underline decoration-2 underline-offset-2 transition-colors"
                                                ),
                                            ],
                                            ["Discord Privacy Policy"]
                                        ),
                                    ],
                                ]),
                            ]),
                            section(h, "middle", "10. International Data Transfers", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.",
                                ]),
                            ]),
                            section(h, "middle", "11. Children's Privacy", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "The Service is not intended for children under 13. We do not knowingly collect information from children under 13. If you believe a child has provided us with personal information, please contact us immediately and we will delete the information.",
                                ]),
                            ]),
                            section(h, "middle", "12. Changes to This Policy", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the Service or sending you an email.",
                                ]),
                            ]),
                            section(h, "last", "13. Contact Us", [
                                para(h, "text-lg leading-relaxed sm:text-xl", [
                                    "If you have questions about this Privacy Policy, wish to exercise your data rights, or have concerns about your information, please contact us through our ",
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

export { discordServerLink };
