import { Match, Option } from "effect";

import type { Html, HtmlBuilder } from "foldkit/html";

import { appBackLink } from "../ui/chrome.ts";
import { discordIcon, googleIcon } from "../ui/icons.ts";

const loginHrefFor = (provider: "google" | "discord", returnTo: Option.Option<string>): string =>
    Option.match(returnTo, {
        onNone: () => `/auth/${provider}/login`,
        onSome: (destination) => `/auth/${provider}/login?returnTo=${encodeURIComponent(destination)}`,
    });

/**
 * Sign in is a server round trip that lands back here with `?error=` when it
 * could not be completed. The callback deliberately keeps the reason vague, so
 * the visitor gets the one thing that is actually true and actionable: it did
 * not work, and trying again is worth a shot.
 */
const problemFor = (error: string): string =>
    Match.value(error).pipe(
        Match.withReturnType<string>(),
        Match.when("oauth", () => "We couldn't finish signing you in. Please try again."),
        Match.orElse(() => "Something went wrong signing you in. Please try again.")
    );

const problemBanner = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.p(
        [
            h.Role("alert"),
            h.Class("font-mono mb-6 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-700"),
        ],
        [text]
    );

const perk = <M>(h: HtmlBuilder<M>, icon: string, text: string): Html =>
    h.div(
        [h.Class("text-dark-blue flex items-center gap-3 text-lg")],
        [h.span([h.Class("text-xl")], [icon]), h.span([], [text])]
    );

export const loginView = <M>(h: HtmlBuilder<M>, returnTo: Option.Option<string>, error: Option.Option<string>): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            appBackLink(h, "/", "← Back to Home"),
            h.div(
                [h.Class("bg-card-bg shadow-pixel-hover border-gold w-full max-w-md rounded-2xl border-3 p-8")],
                [
                    h.div(
                        [h.Class("mb-8 text-center")],
                        [
                            h.h1([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Welcome to Tinyburg"]),
                            h.p(
                                [h.Class("font-mono text-xl text-gray-600")],
                                ["Sign in or create an account to get started"]
                            ),
                        ]
                    ),
                    ...Option.match(error, {
                        onSome: (code) => [problemBanner(h, problemFor(code))],
                        onNone: () => [],
                    }),
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            h.a(
                                [
                                    h.Href(loginHrefFor("google", returnTo)),
                                    h.Class(
                                        "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue flex w-full items-center justify-center gap-3 rounded-lg border-2 border-gray-300 bg-white px-6 py-4 font-mono text-xl text-gray-800 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                    ),
                                ],
                                [googleIcon(h, "h-6 w-6 shrink-0"), h.span([], ["Continue with Google"])]
                            ),
                            h.a(
                                [
                                    h.Href(loginHrefFor("discord", returnTo)),
                                    h.Class(
                                        "bg-discord shadow-pixel hover:shadow-pixel-hover flex w-full items-center justify-center gap-3 rounded-lg px-6 py-4 font-mono text-xl text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#4752c4]"
                                    ),
                                ],
                                [discordIcon(h, "h-6 w-6 shrink-0"), h.span([], ["Continue with Discord"])]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("bg-sky-blue/10 border-sky-blue/20 mt-8 flex flex-col gap-2 rounded-lg border-2 p-4")],
                        [
                            perk(h, "🎯", "Find dream job bitizens"),
                            perk(h, "🤝", "Trade with thousands of players"),
                            perk(h, "🎨", "Collect rare costumes & pets"),
                        ]
                    ),
                    h.div(
                        [h.Class("mt-6 text-center")],
                        [
                            h.p(
                                [h.Class("text-text-dark/70 text-base")],
                                [
                                    "By continuing, you agree to our ",
                                    h.a(
                                        [h.Href("/terms"), h.Class("text-sky-dark no-underline hover:underline")],
                                        ["Terms of Service"]
                                    ),
                                    " and ",
                                    h.a(
                                        [h.Href("/privacy"), h.Class("text-sky-dark no-underline hover:underline")],
                                        ["Privacy Policy"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    );
