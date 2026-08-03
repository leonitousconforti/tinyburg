import { Match } from "effect";

import type { AppsState } from "../backend.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appBackLink } from "../ui/chrome.ts";

const appsList = <M>(h: HtmlBuilder<M>, apps: AppsState): Html =>
    Match.value(apps).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            AppsIdle: () => h.empty,
            AppsLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], ["Loading your applications..."]),
            AppsFailed: () =>
                h.p(
                    [h.Class("font-mono text-xl text-red-700")],
                    ["We couldn't load your applications. Please refresh to try again."]
                ),
            AppsLoaded: ({ apps }) =>
                apps.length === 0
                    ? h.p(
                          [h.Class("font-mono text-xl text-gray-600")],
                          [
                              "No applications yet. Register one to let people sign in to your app with their Tinyburg account.",
                          ]
                      )
                    : h.div(
                          [h.Class("flex flex-col gap-4")],
                          apps.map((client) =>
                              h.keyed("a")(
                                  client.id,
                                  [
                                      h.Href(`/developers/apps/${client.id}`),
                                      h.Class(
                                          "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue block rounded-lg border-2 border-gray-300 bg-white p-4 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                      ),
                                  ],
                                  [
                                      h.div([h.Class("font-mono text-2xl text-gray-800")], [client.name]),
                                      h.div([h.Class("font-mono text-base break-all text-gray-500")], [client.id]),
                                  ]
                              )
                          )
                      ),
        })
    );

export const developerAppsView = <M>(h: HtmlBuilder<M>, apps: AppsState): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/", "← Back to Home"),
            h.div(
                [h.Class("bg-card-bg shadow-pixel-hover border-gold w-full max-w-2xl rounded-2xl border-3 p-8")],
                [
                    h.div(
                        [h.Class("mb-8 flex items-center justify-between gap-4")],
                        [
                            h.h1([h.Class("font-pixel text-lg text-gray-800")], ["OAuth Applications"]),
                            h.a(
                                [
                                    h.Href("/developers/apps/new"),
                                    h.Class(
                                        "bg-gold shadow-pixel hover:shadow-pixel-hover font-pixel shrink-0 rounded-lg px-4 py-3 text-[0.7rem] text-gray-800 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                    ),
                                ],
                                ["+ New Application"]
                            ),
                        ]
                    ),
                    appsList(h, apps),
                ]
            ),
        ]
    );
