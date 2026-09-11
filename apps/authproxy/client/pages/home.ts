import { Option } from "effect";

import type { SessionState } from "../backend.ts";
import type { HomeMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { card, primaryButton } from "@tinyburg/shared-ui/Chrome";
import { codeBlock } from "@tinyburg/shared-ui/Code";

import { loginHref } from "../routes.ts";

const sectionHeading = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.h2([h.Class("font-pixel mb-3 text-[0.7rem] text-gray-800")], [text]);

/**
 * The front page carries everything an unauthenticated visitor can use: what
 * the proxy is, the public test keys, and the way in.
 */
export const homeView = <M>(h: HtmlBuilder<M>, msgs: HomeMessages, session: SessionState): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center gap-6 p-8 pt-16")],
        [
            h.div(
                [h.Class("flex w-full max-w-3xl flex-col gap-6")],
                [
                    h.div(
                        [h.Class("text-center")],
                        [
                            h.h1([h.Class("font-pixel text-dark-blue mb-3 text-xl")], [msgs.title]),
                            h.p([h.Class("font-mono text-2xl text-white/90")], [msgs.tagline]),
                        ]
                    ),
                    h.div(
                        [h.Class("flex justify-center")],
                        [
                            session._tag === "SignedIn"
                                ? h.a([h.Href("/keys"), h.Class(primaryButton + " no-underline")], [msgs.manageKeys])
                                : h.a(
                                      [
                                          h.Href(loginHref(Option.some("/keys"))),
                                          h.Class(primaryButton + " no-underline"),
                                      ],
                                      [msgs.signIn]
                                  ),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            sectionHeading(h, msgs.howItWorksHeading),
                            h.p([h.Class("font-mono mb-4 text-xl text-gray-700")], [msgs.howItWorksIntro]),
                            codeBlock(
                                h,
                                "sh",
                                `curl -H "Authorization: Bearer <your-key>" \\\n     https://authproxy.tinyburg.app/player_details/tt/:playerId`
                            ),
                            h.p([h.Class("font-mono mt-4 text-xl text-gray-700")], [msgs.howItWorksScopes]),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            sectionHeading(h, msgs.sdkHeading),
                            h.p(
                                [h.Class("font-mono mb-4 text-xl text-gray-700")],
                                [
                                    msgs.sdkIntroBefore,
                                    h.a(
                                        [
                                            h.Href("https://www.npmjs.com/package/@tinyburg/tinytower-sdk"),
                                            h.Class("text-sky-dark underline"),
                                        ],
                                        ["@tinyburg/tinytower-sdk"]
                                    ),
                                    msgs.sdkIntroAfter,
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-col gap-2")],
                                [
                                    codeBlock(
                                        h,
                                        "sh",
                                        "npm install @tinyburg/tinytower-sdk @tinyburg/nimblebit-sdk effect"
                                    ),
                                    codeBlock(
                                        h,
                                        "ts",
                                        [
                                            `import { NodeServices } from "@effect/platform-node";`,
                                            `import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";`,
                                            `import { TinyTower } from "@tinyburg/tinytower-sdk";`,
                                            `import { Config, Effect, Layer } from "effect";`,
                                            `import { FetchHttpClient } from "effect/unstable/http";`,
                                            ``,
                                            `const Live = Layer.merge(`,
                                            `    FetchHttpClient.layer,`,
                                            `    NimblebitAuth.layerTinyburgAuthProxyConfig({`,
                                            `        authKey: Config.redacted("AUTH_KEY"),`,
                                            `    })`,
                                            `).pipe(Layer.provide(NodeServices.layer));`,
                                            ``,
                                            `const program = Effect.gen(function* () {`,
                                            `    const me = yield* NimblebitConfig.AuthenticatedPlayerConfig;`,
                                            `    const { visits } = yield* TinyTower.social_getVisits(me);`,
                                            `    yield* Effect.log(visits);`,
                                            `});`,
                                            ``,
                                            `Effect.runPromise(Effect.provide(program, Live));`,
                                        ].join("\n")
                                    ),
                                ]
                            ),
                            h.p([h.Class("font-mono mt-4 text-xl text-gray-700")], [msgs.sdkOutro]),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            sectionHeading(h, msgs.testKeysHeading),
                            h.p([h.Class("font-mono mb-4 text-xl text-gray-700")], [msgs.testKeysIntro]),
                            h.div(
                                [h.Class("flex flex-col gap-2")],
                                [
                                    codeBlock(h, "sh", "00000000-0000-0000-0000-000000000001   # no scopes"),
                                    codeBlock(h, "sh", "00000000-0000-0000-0000-000000000002   # all read-only scopes"),
                                ]
                            ),
                            h.p([h.Class("font-mono mt-4 text-xl text-gray-700")], [msgs.testKeysOutro]),
                        ]
                    ),
                    h.p(
                        [h.Class("text-center font-mono text-lg text-white/80")],
                        [
                            msgs.footerBefore,
                            h.a([h.Href("https://tinyburg.app"), h.Class("text-white underline")], ["tinyburg.app"]),
                            msgs.footerAfter,
                        ]
                    ),
                ]
            ),
        ]
    );
