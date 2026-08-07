import { Option } from "effect";

import type { SessionState } from "../backend.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { card, primaryButton } from "@tinyburg/ui/Chrome";
import { codeBlock } from "@tinyburg/ui/Code";

import { loginHref } from "../routes.ts";

const sectionHeading = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.h2([h.Class("font-pixel mb-3 text-[0.7rem] text-gray-800")], [text]);

/**
 * The front page carries everything an unauthenticated visitor can use: what
 * the proxy is, the public test keys, and the way in.
 */
export const homeView = <M>(h: HtmlBuilder<M>, session: SessionState): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center gap-6 p-8 pt-16")],
        [
            h.div(
                [h.Class("flex w-full max-w-3xl flex-col gap-6")],
                [
                    h.div(
                        [h.Class("text-center")],
                        [
                            h.h1([h.Class("font-pixel text-dark-blue mb-3 text-xl")], ["Tinyburg Authproxy"]),
                            h.p(
                                [h.Class("font-mono text-2xl text-white/90")],
                                ["Authenticated, rate-limited access to Nimblebit's TinyTower servers."]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex justify-center")],
                        [
                            session._tag === "SignedIn"
                                ? h.a(
                                      [h.Href("/keys"), h.Class(primaryButton + " no-underline")],
                                      ["Manage your API keys →"]
                                  )
                                : h.a(
                                      [
                                          h.Href(loginHref(Option.some("/keys"))),
                                          h.Class(primaryButton + " no-underline"),
                                      ],
                                      ["Sign in with Tinyburg →"]
                                  ),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            sectionHeading(h, "How it works"),
                            h.p(
                                [h.Class("font-mono mb-4 text-xl text-gray-700")],
                                [
                                    "The proxy signs your requests before forwarding them to Nimblebit, so you never touch salts or hashes. Authenticate with an API key as a bearer token:",
                                ]
                            ),
                            codeBlock(
                                h,
                                "sh",
                                `curl -H "Authorization: Bearer <your-key>" \\\n     https://authproxy.tinyburg.app/player_details/tt/:playerId`
                            ),
                            h.p(
                                [h.Class("font-mono mt-4 text-xl text-gray-700")],
                                [
                                    "A key carries scopes, one per endpoint family, and its own rate limit. Sign in with your Tinyburg account to provision read-only keys yourself, see the keys you hold, and rotate any that leak.",
                                ]
                            ),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            sectionHeading(h, "Use the SDK"),
                            h.p(
                                [h.Class("font-mono mb-4 text-xl text-gray-700")],
                                [
                                    "This proxy serves the same endpoint definitions that ",
                                    h.a(
                                        [
                                            h.Href("https://www.npmjs.com/package/@tinyburg/tinytower-sdk"),
                                            h.Class("text-sky-dark underline"),
                                        ],
                                        ["@tinyburg/tinytower-sdk"]
                                    ),
                                    " is built from, so a typed TypeScript client comes for free. It decodes save data, friends, gifts, visits and raffles into real types, and it already knows how to aim itself here:",
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
                            h.p(
                                [h.Class("font-mono mt-4 text-xl text-gray-700")],
                                [
                                    "AUTH_KEY is the proxy key you provisioned here; PLAYER_ID and PLAYER_AUTH_KEY name the tower you are acting as. Pulled saves come back as gzipped Nimblebit soup — hand them to the SDK's SaveData schema and you get floors, bitizens, missions and friends as ordinary typed values.",
                                ]
                            ),
                        ]
                    ),
                    h.section(
                        [h.Class(card)],
                        [
                            sectionHeading(h, "Public test keys"),
                            h.p(
                                [h.Class("font-mono mb-4 text-xl text-gray-700")],
                                ["Two shared keys exist for kicking the tires. They are rate limited by IP address:"]
                            ),
                            h.div(
                                [h.Class("flex flex-col gap-2")],
                                [
                                    codeBlock(h, "sh", "00000000-0000-0000-0000-000000000001   # no scopes"),
                                    codeBlock(h, "sh", "00000000-0000-0000-0000-000000000002   # all read-only scopes"),
                                ]
                            ),
                            h.p(
                                [h.Class("font-mono mt-4 text-xl text-gray-700")],
                                [
                                    "Personal keys are rate limited per key instead, and start at 10 requests a minute. Need write scopes or a higher limit? Reach out on Discord.",
                                ]
                            ),
                        ]
                    ),
                    h.p(
                        [h.Class("text-center font-mono text-lg text-white/80")],
                        [
                            "Part of ",
                            h.a([h.Href("https://tinyburg.app"), h.Class("text-white underline")], ["tinyburg.app"]),
                            " — not affiliated with Nimblebit.",
                        ]
                    ),
                ]
            ),
        ]
    );
