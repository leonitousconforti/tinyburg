import { Effect, Match, Option, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { TowerLinkMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { PlayerEmailSchema, PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { Command, Dom } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { evo } from "foldkit/struct";

import { Api } from "../backend.ts";
import { LinkableGame, linkableGameInfo } from "../linkableGames.ts";
import { appBackLink } from "../ui/chrome.ts";

// MODEL

export const WizardModel = S.Struct({
    // Which game this save is being linked from; picks the trading api group
    // the requests go to and names the game the page is for.
    game: LinkableGame,
    step: S.Literals(["link", "verify"]),
    // How the current step was entered, driving the slide animation.
    entered: S.Literals(["initial", "forward", "backward"]),
    friendCode: S.String,
    email: S.String,
    verificationCode: S.String,
    // Details from step one, kept for the verify and resend requests.
    pendingFriendCode: S.String,
    pendingEmail: S.String,
    submitting: S.Boolean,
    verified: S.Boolean,
    // Errors are stored as keys and turned into copy by the view, which is
    // the only place that knows the language.
    linkError: S.Option(S.Literals(["requestFailed"])),
    verifyError: S.Option(S.Literals(["verifyFailed", "resendFailed"])),
    resend: S.Literals(["idle", "sending", "sent", "cooldown"]),
});
export type WizardModel = typeof WizardModel.Type;

export const initialWizardFor = (game: LinkableGame): WizardModel => ({
    game,
    step: "link",
    entered: "initial",
    friendCode: "",
    email: "",
    verificationCode: "",
    pendingFriendCode: "",
    pendingEmail: "",
    submitting: false,
    verified: false,
    linkError: Option.none(),
    verifyError: Option.none(),
    resend: "idle",
});

// MESSAGE

/**
 * Everything this page can say.
 *
 * `defineMessageUnion` declares the union and its constructors together, so a
 * variant cannot be added without joining the union or removed while something
 * still matches on it.
 */
export const WizardMessage = defineMessageUnion({
    ChangedFriendCode: { value: S.String },
    ChangedEmail: { value: S.String },
    ChangedVerificationCode: { value: S.String },
    SubmittedLinkForm: {},
    SucceededRequestCode: { friendCode: S.String, email: S.String },
    FailedRequestCode: {},
    SubmittedVerifyForm: {},
    SucceededVerify: {},
    FailedVerify: {},
    ClickedBack: {},
    ClickedResend: {},
    SucceededResend: {},
    FailedResend: {},
    CompletedResendCooldown: {},
    CompletedStepFocus: {},
});
export type WizardMessage = typeof WizardMessage.Type;

// COMMAND

// Step one of the round trip with Nimblebit: asking to link a tower makes
// them email a verification code to the address its cloud save lives under.
// The friend code and email are branded schemas, so mistyped input fails
// here, before a request is made.
// The trading api gives each game its own accounts group with the same
// shape; the wizard's game picks which one the link and verify calls go to.
const requestVerificationCode = (game: LinkableGame, friendCode: string, email: string) =>
    Effect.gen(function* () {
        const api = yield* Api;
        const accounts = game === "tinytower" ? api.TinyTowerAccountsGroup : api.TinyTowerClassicAccountsGroup;
        const playerId = yield* S.decodeEffect(PlayerIdSchema)(friendCode);
        const playerEmail = yield* S.decodeEffect(PlayerEmailSchema)(email);
        yield* accounts.LinkAccount({ payload: { playerId, email: playerEmail } });
    });

// Step two: presenting the emailed code proves the tower is theirs and links it.
const verifyAndLink = (game: LinkableGame, friendCode: string, verificationCode: string) =>
    Effect.gen(function* () {
        const api = yield* Api;
        const accounts = game === "tinytower" ? api.TinyTowerAccountsGroup : api.TinyTowerClassicAccountsGroup;
        const playerId = yield* S.decodeEffect(PlayerIdSchema)(friendCode);
        yield* accounts.VerifyAccount({ params: { playerId }, payload: { verificationCode } });
    });

const RequestCode = Command.define("RequestCode", {
    args: { game: LinkableGame, friendCode: S.String, email: S.String },
    messages: [WizardMessage.SucceededRequestCode, WizardMessage.FailedRequestCode],
    execute: ({ email, friendCode, game }) =>
        requestVerificationCode(game, friendCode, email).pipe(
            Effect.as(WizardMessage.SucceededRequestCode({ friendCode, email })),
            Effect.catch(() => Effect.succeed(WizardMessage.FailedRequestCode()))
        ),
});

const VerifyAndLink = Command.define("VerifyAndLink", {
    args: { game: LinkableGame, friendCode: S.String, verificationCode: S.String },
    messages: [WizardMessage.SucceededVerify, WizardMessage.FailedVerify],
    execute: ({ friendCode, game, verificationCode }) =>
        verifyAndLink(game, friendCode, verificationCode).pipe(
            Effect.as(WizardMessage.SucceededVerify()),
            Effect.catch(() => Effect.succeed(WizardMessage.FailedVerify()))
        ),
});

const ResendCode = Command.define("ResendCode", {
    args: { game: LinkableGame, friendCode: S.String, email: S.String },
    messages: [WizardMessage.SucceededResend, WizardMessage.FailedResend],
    execute: ({ email, friendCode, game }) =>
        requestVerificationCode(game, friendCode, email).pipe(
            Effect.as(WizardMessage.SucceededResend()),
            Effect.catch(() => Effect.succeed(WizardMessage.FailedResend()))
        ),
});

const ResendCooldown = Command.define("ResendCooldown", {
    messages: [WizardMessage.CompletedResendCooldown],
    execute: Effect.sleep("2 seconds").pipe(Effect.as(WizardMessage.CompletedResendCooldown())),
});

const FocusInput = Command.define("FocusInput", {
    args: { selector: S.String },
    messages: [WizardMessage.CompletedStepFocus],
    execute: ({ selector }) =>
        Dom.focus(selector).pipe(
            Effect.as(WizardMessage.CompletedStepFocus()),
            Effect.catch(() => Effect.succeed(WizardMessage.CompletedStepFocus()))
        ),
});

// UPDATE

type WizardStep = readonly [WizardModel, ReadonlyArray<Command.Command<WizardMessage, never, Api>>];

export const updateWizard = (wizard: WizardModel, message: WizardMessage): WizardStep =>
    Match.value(message).pipe(
        Match.withReturnType<WizardStep>(),
        Match.tagsExhaustive({
            ChangedFriendCode: ({ value }) => [
                evo(wizard, { friendCode: () => value.toUpperCase().replaceAll(/[^0-9A-Z]/g, "") }),
                [],
            ],
            ChangedEmail: ({ value }) => [evo(wizard, { email: () => value }), []],
            ChangedVerificationCode: ({ value }) => [evo(wizard, { verificationCode: () => value }), []],
            SubmittedLinkForm: () => [
                evo(wizard, { submitting: () => true, linkError: Option.none }),
                [RequestCode({ game: wizard.game, friendCode: wizard.friendCode.trim(), email: wizard.email.trim() })],
            ],
            SucceededRequestCode: ({ email, friendCode }) => [
                evo(wizard, {
                    submitting: () => false,
                    step: () => "verify" as const,
                    entered: () => "forward" as const,
                    pendingFriendCode: () => friendCode,
                    pendingEmail: () => email,
                    verificationCode: () => "",
                    verifyError: Option.none,
                    resend: () => "idle" as const,
                }),
                [FocusInput({ selector: "#verification-code-input" })],
            ],
            FailedRequestCode: () => [
                evo(wizard, {
                    submitting: () => false,
                    linkError: () => Option.some("requestFailed" as const),
                }),
                [],
            ],
            SubmittedVerifyForm: () => [
                evo(wizard, { submitting: () => true, verifyError: Option.none }),
                [
                    VerifyAndLink({
                        game: wizard.game,
                        friendCode: wizard.pendingFriendCode,
                        verificationCode: wizard.verificationCode.trim(),
                    }),
                ],
            ],
            SucceededVerify: () => [evo(wizard, { verified: () => true }), []],
            FailedVerify: () => [
                evo(wizard, {
                    submitting: () => false,
                    verifyError: () => Option.some("verifyFailed" as const),
                }),
                [],
            ],
            ClickedBack: () => [
                evo(wizard, { step: () => "link" as const, entered: () => "backward" as const }),
                [FocusInput({ selector: "#friend-code-input" })],
            ],
            ClickedResend: () => [
                evo(wizard, { resend: () => "sending" as const }),
                [ResendCode({ game: wizard.game, friendCode: wizard.pendingFriendCode, email: wizard.pendingEmail })],
            ],
            SucceededResend: () => [evo(wizard, { resend: () => "sent" as const }), [ResendCooldown()]],
            FailedResend: () => [
                evo(wizard, {
                    resend: () => "cooldown" as const,
                    verifyError: () => Option.some("resendFailed" as const),
                }),
                [ResendCooldown()],
            ],
            CompletedResendCooldown: () => [evo(wizard, { resend: () => "idle" as const }), []],
            CompletedStepFocus: () => [wizard, []],
        })
    );

// VIEW

const submitButtonClass =
    "bg-gold shadow-pixel hover:shadow-pixel-hover font-pixel w-full cursor-pointer rounded-lg border-2 border-transparent px-6 py-4 text-sm text-gray-800 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-pixel";

const errorBox = <M>(h: HtmlBuilder<M>, error: Option.Option<string>): Html =>
    Option.match(error, {
        onNone: () => h.empty,
        onSome: (message) =>
            h.div(
                [h.Role("alert"), h.Class("rounded-lg border-2 border-red-300 bg-red-50 p-4")],
                [h.p([h.Class("font-mono text-lg text-red-700")], [message])]
            ),
    });

const fieldLabel = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.span([h.Class("font-pixel text-[0.6rem] text-gray-500")], [text]);

const fieldHint = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.span([h.Class("font-mono text-base text-gray-500")], [text]);

const stepClass = (wizard: WizardModel): string =>
    wizard.entered === "forward" ? "step-enter-forward" : wizard.entered === "backward" ? "step-enter-backward" : "";

const linkStep = (wizard: WizardModel, msgs: TowerLinkMessages, h: HtmlBuilder<AppMessage>): Html =>
    h.keyed("section")(
        "link",
        [h.Class(stepClass(wizard))],
        [
            h.form(
                [h.Class("flex flex-col gap-6"), h.OnSubmit(WizardMessage.SubmittedLinkForm())],
                [
                    h.label(
                        [h.Class("flex flex-col gap-2")],
                        [
                            fieldLabel(h, msgs.friendCodeLabel),
                            h.input([
                                h.Id("friend-code-input"),
                                h.Type("text"),
                                h.Attribute("name", "friend-code"),
                                h.Required(true),
                                h.Maxlength(5),
                                h.Pattern("[0-9A-Z]{1,5}"),
                                h.Title(msgs.friendCodeTitle),
                                h.Placeholder("ABC12"),
                                h.Autocomplete("off"),
                                h.Autocapitalize("characters"),
                                h.Spellcheck(false),
                                h.Value(wizard.friendCode),
                                h.OnInput((value) => WizardMessage.ChangedFriendCode({ value })),
                                h.Class(
                                    "font-mono rounded-lg border-2 border-gray-300 bg-white p-3 text-center text-3xl tracking-[0.4em] text-gray-800 uppercase focus:border-sky-blue focus:outline-none"
                                ),
                            ]),
                            fieldHint(h, msgs.friendCodeHint),
                        ]
                    ),
                    h.label(
                        [h.Class("flex flex-col gap-2")],
                        [
                            fieldLabel(h, msgs.emailLabel),
                            h.input([
                                h.Id("email-input"),
                                h.Type("email"),
                                h.Attribute("name", "email"),
                                h.Required(true),
                                h.Placeholder("you@example.com"),
                                h.Autocomplete("email"),
                                h.Value(wizard.email),
                                h.OnInput((value) => WizardMessage.ChangedEmail({ value })),
                                h.Class(
                                    "font-mono rounded-lg border-2 border-gray-300 bg-white p-3 text-xl text-gray-800 focus:border-sky-blue focus:outline-none"
                                ),
                            ]),
                            fieldHint(h, msgs.emailHint),
                        ]
                    ),
                    errorBox(
                        h,
                        Option.map(wizard.linkError, (key) => msgs.errors[key])
                    ),
                    h.button(
                        [h.Type("submit"), h.Disabled(wizard.submitting), h.Class(submitButtonClass)],
                        [wizard.submitting ? msgs.sending : msgs.sendCode]
                    ),
                ]
            ),
        ]
    );

const verifyStep = (wizard: WizardModel, msgs: TowerLinkMessages, h: HtmlBuilder<AppMessage>): Html =>
    h.keyed("section")(
        "verify",
        [h.Class(stepClass(wizard))],
        [
            h.div(
                [h.Class("bg-sky-blue/10 border-sky-blue/20 mb-6 rounded-lg border-2 p-4")],
                [
                    h.p(
                        [h.Class("font-mono text-lg text-dark-blue")],
                        [
                            msgs.sentCodeBefore,
                            h.strong([h.Class("break-all")], [wizard.pendingEmail]),
                            msgs.sentCodeAfter,
                        ]
                    ),
                ]
            ),
            h.form(
                [h.Class("flex flex-col gap-6"), h.OnSubmit(WizardMessage.SubmittedVerifyForm())],
                [
                    h.label(
                        [h.Class("flex flex-col gap-2")],
                        [
                            fieldLabel(h, msgs.codeLabel),
                            h.input([
                                h.Id("verification-code-input"),
                                h.Type("text"),
                                h.Attribute("name", "verification-code"),
                                h.Required(true),
                                h.Maxlength(8),
                                h.Placeholder("1234"),
                                h.Attribute("inputmode", "numeric"),
                                h.Autocomplete("one-time-code"),
                                h.Spellcheck(false),
                                h.Value(wizard.verificationCode),
                                h.OnInput((value) => WizardMessage.ChangedVerificationCode({ value })),
                                h.Class(
                                    "font-mono rounded-lg border-2 border-gray-300 bg-white p-3 text-center text-3xl tracking-[0.4em] text-gray-800 focus:border-sky-blue focus:outline-none"
                                ),
                            ]),
                            fieldHint(h, msgs.codeHint),
                        ]
                    ),
                    errorBox(
                        h,
                        Option.map(wizard.verifyError, (key) => msgs.errors[key])
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(wizard.submitting || wizard.verified),
                            h.Class(submitButtonClass),
                        ],
                        [wizard.verified ? msgs.linked : wizard.submitting ? msgs.verifying : msgs.linkMyTower]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-6 flex items-center justify-between")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(WizardMessage.ClickedBack()),
                            h.Class("font-mono text-sky-dark cursor-pointer text-lg hover:underline"),
                        ],
                        [msgs.goBack]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(WizardMessage.ClickedResend()),
                            h.Disabled(wizard.resend !== "idle"),
                            h.Class(
                                "font-mono text-sky-dark cursor-pointer text-lg hover:underline disabled:cursor-not-allowed"
                            ),
                        ],
                        [wizard.resend === "sent" ? msgs.sent : msgs.resend]
                    ),
                ]
            ),
        ]
    );

export const towerLinkView = (h: HtmlBuilder<AppMessage>, msgs: TowerLinkMessages, wizard: WizardModel): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            appBackLink(h, "/towers/@me", msgs.backToTowers),
            h.div(
                [h.Class("bg-card-bg shadow-pixel-hover border-gold w-full max-w-md rounded-2xl border-3 p-8")],
                [
                    h.div(
                        [h.Class("mb-6 text-center")],
                        [
                            h.h1([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.heading]),
                            h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.subheading]),
                            h.p(
                                [h.Class("font-pixel mt-3 text-[0.6rem] tracking-wider text-gray-400 uppercase")],
                                [linkableGameInfo[wizard.game].name]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mb-8 flex items-center gap-3")],
                        [
                            h.div([h.Class("bg-gold h-2 flex-1 rounded-full"), h.AriaHidden(true)], []),
                            h.span(
                                [h.Class("font-pixel shrink-0 text-[0.55rem] text-gray-500")],
                                [wizard.step === "link" ? msgs.step1 : msgs.step2]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        `h-2 flex-1 rounded-full transition-colors duration-300 ${wizard.step === "verify" ? "bg-gold" : "bg-gray-300"}`
                                    ),
                                    h.AriaHidden(true),
                                ],
                                []
                            ),
                        ]
                    ),
                    wizard.step === "link" ? linkStep(wizard, msgs, h) : verifyStep(wizard, msgs, h),
                ]
            ),
        ]
    );
