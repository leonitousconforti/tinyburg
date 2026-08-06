import { Option } from "effect";

import type { Html, HtmlBuilder } from "foldkit/html";

import { appBackLink, card } from "@tinyburg/ui/Chrome";
import { towerIcon } from "@tinyburg/ui/Icons";

import { startLoginHref } from "../routes.ts";

/**
 * Sign in is a server round trip that lands back here with `?error=` when it
 * could not be completed. Cancelling is not a failure and does not read like
 * one; the rest differ only in what the visitor should try next.
 */
const problemFor = (error: string): { readonly denied: boolean; readonly text: string } => {
    if (error === "oauth_denied") {
        return {
            denied: true,
            text: "Sign in was cancelled. You can pick up where you left off whenever you like.",
        };
    }
    if (error === "invalid_oauth_cookies" || error === "invalid_oauth_callback") {
        return {
            denied: false,
            text: "That sign in attempt expired or was interrupted. Please start again, and check that your browser allows cookies for this site.",
        };
    }
    return {
        denied: false,
        text: "We couldn't finish signing you in. Please try again.",
    };
};

const problemBanner = <M>(h: HtmlBuilder<M>, denied: boolean, text: string): Html =>
    h.p(
        [
            h.Role(denied ? "status" : "alert"),
            h.Class(
                denied
                    ? "font-mono border-sky-blue bg-sky-light/40 text-sky-dark mb-6 rounded-lg border-2 px-4 py-3 text-lg"
                    : "font-mono mb-6 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-700"
            ),
        ],
        [text]
    );

export const loginView = <M>(h: HtmlBuilder<M>, returnTo: Option.Option<string>, error: Option.Option<string>): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            appBackLink(h, "/", "← Back to Home"),
            h.div(
                [h.Class(card + " max-w-md")],
                [
                    h.div(
                        [h.Class("mb-8 text-center")],
                        [
                            h.h1([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Authproxy Self Service"]),
                            h.p(
                                [h.Class("font-mono text-xl text-gray-600")],
                                ["Your Tinyburg account is your identity here — one sign in, no new password."]
                            ),
                        ]
                    ),
                    ...Option.match(error, {
                        onSome: (code) => {
                            const { denied, text } = problemFor(code);
                            return [problemBanner(h, denied, text)];
                        },
                        onNone: () => [],
                    }),
                    h.a(
                        [
                            h.Href(startLoginHref(returnTo)),
                            h.Class(
                                "bg-dark-blue shadow-pixel hover:shadow-pixel-hover flex w-full items-center justify-center gap-3 rounded-lg px-6 py-4 font-mono text-xl text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                            ),
                        ],
                        [towerIcon(h, "h-6 w-6 shrink-0"), h.span([], ["Sign in with Tinyburg"])]
                    ),
                    h.p(
                        [h.Class("font-mono mt-6 text-center text-lg text-gray-500")],
                        [
                            "No Tinyburg account yet? ",
                            h.a(
                                [h.Href("https://tinyburg.app/login"), h.Class("text-sky-dark underline")],
                                ["Create one at tinyburg.app"]
                            ),
                            " first.",
                        ]
                    ),
                ]
            ),
        ]
    );
