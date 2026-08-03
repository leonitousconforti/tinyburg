import { Effect, Match, Option, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { AsyncData, Command } from "foldkit";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { ConsentPrompt } from "../../shared/api.ts";
import { Api } from "../backend.ts";

// MODEL

export const ConsentPromptData = AsyncData.Schema(ConsentPrompt, S.String);

export const ConsentModel = S.Struct({
    requestId: S.Option(S.String),
    prompt: ConsentPromptData.schema,
    deciding: S.Boolean,
    decisionFailed: S.Boolean,
});
export type ConsentModel = typeof ConsentModel.Type;

export const consentFor = (requestId: Option.Option<string>): ConsentModel => ({
    requestId,
    prompt: ConsentPromptData.Idle(),
    deciding: false,
    decisionFailed: false,
});

// MESSAGE

export const GotConsentPrompt = m("GotConsentPrompt", { prompt: ConsentPromptData.schema });
export const ClickedApprove = m("ClickedApprove");
export const ClickedDeny = m("ClickedDeny");
export const GotConsentRedirect = m("GotConsentRedirect", { redirectTo: S.String });
export const FailedConsentDecision = m("FailedConsentDecision");

export const ConsentMessage = S.Union([
    GotConsentPrompt,
    ClickedApprove,
    ClickedDeny,
    GotConsentRedirect,
    FailedConsentDecision,
]);
export type ConsentMessage = typeof ConsentMessage.Type;

// COMMAND

export const FetchConsentPrompt = Command.define("FetchConsentPrompt", {
    args: { requestId: S.String },
    messages: [GotConsentPrompt],
    execute: ({ requestId }) =>
        Effect.gen(function* () {
            const api = yield* Api;
            const prompt = yield* api.ConsentGroup.prompt({ params: { requestId } });
            return GotConsentPrompt({ prompt: ConsentPromptData.Success({ data: prompt }) });
        }).pipe(
            Effect.catchTag("NotFound", () =>
                Effect.succeed(
                    GotConsentPrompt({
                        prompt: ConsentPromptData.Failure({
                            error: "This authorization request has expired or was already handled. Head back to the app you came from and try again.",
                        }),
                    })
                )
            ),
            Effect.catch(() =>
                Effect.succeed(
                    GotConsentPrompt({
                        prompt: ConsentPromptData.Failure({
                            error: "We couldn't load this authorization request. Please try again.",
                        }),
                    })
                )
            )
        ),
});

const SubmitConsentDecision = Command.define("SubmitConsentDecision", {
    args: { requestId: S.String, approve: S.Boolean },
    messages: [GotConsentRedirect, FailedConsentDecision],
    execute: ({ approve, requestId }) =>
        Effect.gen(function* () {
            const api = yield* Api;
            const decision = yield* api.ConsentGroup.decide({ params: { requestId }, payload: { approve } });
            return GotConsentRedirect({ redirectTo: decision.redirectTo });
        }).pipe(Effect.catch(() => Effect.succeed(FailedConsentDecision()))),
});

// UPDATE

type ConsentStep = readonly [ConsentModel, ReadonlyArray<Command.Command<ConsentMessage, never, Api>>];

const decide = (consent: ConsentModel, approve: boolean): ConsentStep => {
    if (consent.deciding) return [consent, []];
    return Option.match(consent.requestId, {
        onNone: () => [consent, []],
        onSome: (requestId) => [
            evo(consent, { deciding: () => true, decisionFailed: () => false }),
            [SubmitConsentDecision({ requestId, approve })],
        ],
    });
};

export const updateConsent = (consent: ConsentModel, message: ConsentMessage): ConsentStep =>
    Match.value(message).pipe(
        Match.withReturnType<ConsentStep>(),
        Match.tagsExhaustive({
            GotConsentPrompt: ({ prompt }) => [evo(consent, { prompt: () => prompt }), []],
            ClickedApprove: () => decide(consent, true),
            ClickedDeny: () => decide(consent, false),
            // The main update turns this into a full-page navigation; deciding
            // stays true so the buttons remain disabled while the browser leaves
            GotConsentRedirect: () => [consent, []],
            FailedConsentDecision: () => [evo(consent, { deciding: () => false, decisionFailed: () => true }), []],
        })
    );

// VIEW

const scopeDescriptions: Record<string, string> = {
    openid: "Confirm your Tinyburg identity",
    profile: "See your display name and avatar",
};

const card = <M>(h: HtmlBuilder<M>, children: ReadonlyArray<Html | string>): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            h.div(
                [h.Class("bg-card-bg shadow-pixel-hover border-gold w-full max-w-md rounded-2xl border-3 p-8")],
                children
            ),
        ]
    );

const statusCard = <M>(h: HtmlBuilder<M>, message: string): Html =>
    card(h, [
        h.div(
            [h.Class("text-center")],
            [
                h.span([h.Class("mb-4 block text-5xl")], ["🔐"]),
                h.p([h.Class("font-mono text-xl text-gray-600")], [message]),
                h.a(
                    [h.Href("/"), h.Class("font-mono text-sky-dark mt-4 inline-block text-lg hover:underline")],
                    ["← Back to Tinyburg"]
                ),
            ]
        ),
    ]);

const promptCard = (h: HtmlBuilder<AppMessage>, consent: ConsentModel, prompt: ConsentPrompt): Html => {
    const destination = new URL(prompt.redirectUri).host;
    return card(h, [
        h.div(
            [h.Class("mb-6 text-center")],
            [
                h.span([h.Class("mb-4 block text-5xl")], ["🔐"]),
                h.h1([h.Class("font-pixel mb-2 text-lg text-gray-800")], [prompt.clientName]),
                h.p([h.Class("font-mono text-xl text-gray-600")], ["wants to access your Tinyburg account"]),
            ]
        ),
        h.div(
            [h.Class("bg-sky-blue/10 border-sky-blue/20 mb-6 flex flex-col gap-2 rounded-lg border-2 p-4")],
            prompt.scopes.map((scope) =>
                h.div(
                    [h.Class("text-dark-blue flex items-center gap-3 text-lg")],
                    [h.span([h.Class("text-xl")], ["✅"]), h.span([], [scopeDescriptions[scope] ?? scope])]
                )
            )
        ),
        consent.decisionFailed
            ? h.div(
                  [h.Role("alert"), h.Class("mb-6 rounded-lg border-2 border-red-300 bg-red-50 p-4")],
                  [h.p([h.Class("font-mono text-lg text-red-700")], ["That didn't go through. Please try again."])]
              )
            : h.empty,
        h.div(
            [h.Class("flex flex-col gap-4")],
            [
                h.button(
                    [
                        h.Type("button"),
                        h.OnClick(ClickedApprove()),
                        h.Disabled(consent.deciding),
                        h.Class(
                            "bg-gold shadow-pixel hover:shadow-pixel-hover font-pixel w-full cursor-pointer rounded-lg px-6 py-4 text-sm text-gray-800 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        ),
                    ],
                    [consent.deciding ? "Working..." : "Authorize"]
                ),
                h.button(
                    [
                        h.Type("button"),
                        h.OnClick(ClickedDeny()),
                        h.Disabled(consent.deciding),
                        h.Class(
                            "shadow-pixel hover:shadow-pixel-hover font-mono w-full cursor-pointer rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-xl text-gray-800 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        ),
                    ],
                    ["Cancel"]
                ),
            ]
        ),
        h.p(
            [h.Class("text-text-dark/70 mt-6 text-center text-base")],
            [`After authorizing you'll be sent back to ${destination}`]
        ),
    ]);
};

export const consentView = (h: HtmlBuilder<AppMessage>, consent: ConsentModel): Html =>
    AsyncData.match(consent.prompt, {
        onIdle: () => statusCard(h, "Loading this authorization request..."),
        onLoading: () => statusCard(h, "Loading this authorization request..."),
        onFailure: (error) => statusCard(h, error),
        onRefreshing: (prompt) => promptCard(h, consent, prompt),
        onStale: ({ data }) => promptCard(h, consent, data),
        onSuccess: (prompt) => promptCard(h, consent, prompt),
    });
