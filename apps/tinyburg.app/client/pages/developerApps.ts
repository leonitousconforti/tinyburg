import type { Html, HtmlBuilder } from "foldkit/html";

import { appBackLink } from "../ui/chrome.ts";

/**
 * Registering and listing OAuth applications has no api yet: the provider
 * reads clients straight from the database yet exposes no management
 * endpoints. The page says so rather than calling something that isn't there.
 */
export const developerAppsView = <M>(h: HtmlBuilder<M>): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/", "← Back to Home"),
            h.div(
                [h.Class("bg-card-bg shadow-pixel-hover border-gold w-full max-w-2xl rounded-2xl border-3 p-8")],
                [
                    h.h1([h.Class("font-pixel mb-6 text-lg text-gray-800")], ["OAuth Applications"]),
                    h.div(
                        [h.Class("rounded-lg border-2 border-dashed border-gray-300 p-8 text-center")],
                        [
                            h.div([h.Class("mb-3 text-4xl")], ["🛠️"]),
                            h.p(
                                [h.Class("font-mono mb-1 text-2xl text-gray-600")],
                                ["Self-serve registration is coming"]
                            ),
                            h.p(
                                [h.Class("font-mono text-lg text-gray-500")],
                                [
                                    "Sign in with Tinyburg already works. Ask in the Discord and we'll register your application by hand in the meantime.",
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            h.Href("/developers"),
                            h.Class("font-mono text-sky-dark mt-6 inline-block text-lg hover:underline"),
                        ],
                        ["← Read the integration guide"]
                    ),
                ]
            ),
        ]
    );
