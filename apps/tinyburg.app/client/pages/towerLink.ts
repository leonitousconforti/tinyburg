import { Effect, Match, Option, Schema as S } from "effect";

import type { Message as AppMessage } from "../main.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Command, Dom } from "foldkit";
import { m } from "foldkit/message";

import { appBackLink } from "../ui/chrome.ts";

// MODEL

export const WizardModel = S.Struct({
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
    linkError: S.Option(S.String),
    verifyError: S.Option(S.String),
    resend: S.Literals(["idle", "sending", "sent", "cooldown"]),
});
export type WizardModel = typeof WizardModel.Type;

export const initialWizard: WizardModel = {
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
};

// MESSAGE

export const ChangedFriendCode = m("ChangedFriendCode", { value: S.String });
export const ChangedEmail = m("ChangedEmail", { value: S.String });
export const ChangedVerificationCode = m("ChangedVerificationCode", { value: S.String });
export const SubmittedLinkForm = m("SubmittedLinkForm");
export const SucceededRequestCode = m("SucceededRequestCode", { friendCode: S.String, email: S.String });
export const FailedRequestCode = m("FailedRequestCode");
export const SubmittedVerifyForm = m("SubmittedVerifyForm");
export const SucceededVerify = m("SucceededVerify");
export const FailedVerify = m("FailedVerify");
export const ClickedBack = m("ClickedBack");
export const ClickedResend = m("ClickedResend");
export const SucceededResend = m("SucceededResend");
export const FailedResend = m("FailedResend");
export const CompletedResendCooldown = m("CompletedResendCooldown");
export const CompletedStepFocus = m("CompletedStepFocus");

export const WizardMessage = S.Union([
    ChangedFriendCode,
    ChangedEmail,
    ChangedVerificationCode,
    SubmittedLinkForm,
    SucceededRequestCode,
    FailedRequestCode,
    SubmittedVerifyForm,
    SucceededVerify,
    FailedVerify,
    ClickedBack,
    ClickedResend,
    SucceededResend,
    FailedResend,
    CompletedResendCooldown,
    CompletedStepFocus,
]);
export type WizardMessage = typeof WizardMessage.Type;

// COMMAND

// TODO: POST /v1/tinytower/linkedAccounts/link/:friendCode/:email once the
// LinkedTinytowerAccountsGroup handlers are mounted.
const requestVerificationCode = (_friendCode: string, _email: string): Effect.Effect<void, Error> => Effect.void;

// TODO: PATCH /v1/tinytower/linkedAccounts/verify/:friendCode/:verificationCode
// once the LinkedTinytowerAccountsGroup handlers are mounted.
const verifyAndLink = (_friendCode: string, _verificationCode: string): Effect.Effect<void, Error> => Effect.void;

const RequestCode = Command.define("RequestCode", {
    args: { friendCode: S.String, email: S.String },
    messages: [SucceededRequestCode, FailedRequestCode],
    execute: ({ email, friendCode }) =>
        requestVerificationCode(friendCode, email).pipe(
            Effect.as(SucceededRequestCode({ friendCode, email })),
            Effect.catch(() => Effect.succeed(FailedRequestCode()))
        ),
});

const VerifyAndLink = Command.define("VerifyAndLink", {
    args: { friendCode: S.String, verificationCode: S.String },
    messages: [SucceededVerify, FailedVerify],
    execute: ({ friendCode, verificationCode }) =>
        verifyAndLink(friendCode, verificationCode).pipe(
            Effect.as(SucceededVerify()),
            Effect.catch(() => Effect.succeed(FailedVerify()))
        ),
});

const ResendCode = Command.define("ResendCode", {
    args: { friendCode: S.String, email: S.String },
    messages: [SucceededResend, FailedResend],
    execute: ({ email, friendCode }) =>
        requestVerificationCode(friendCode, email).pipe(
            Effect.as(SucceededResend()),
            Effect.catch(() => Effect.succeed(FailedResend()))
        ),
});

const ResendCooldown = Command.define("ResendCooldown", {
    messages: [CompletedResendCooldown],
    execute: Effect.sleep("2 seconds").pipe(Effect.as(CompletedResendCooldown())),
});

const FocusInput = Command.define("FocusInput", {
    args: { selector: S.String },
    messages: [CompletedStepFocus],
    execute: ({ selector }) =>
        Dom.focus(selector).pipe(
            Effect.as(CompletedStepFocus()),
            Effect.catch(() => Effect.succeed(CompletedStepFocus()))
        ),
});

// UPDATE

type WizardStep = readonly [WizardModel, ReadonlyArray<Command.Command<WizardMessage>>];

export const updateWizard = (wizard: WizardModel, message: WizardMessage): WizardStep =>
    Match.value(message).pipe(
        Match.withReturnType<WizardStep>(),
        Match.tagsExhaustive({
            ChangedFriendCode: ({ value }) => [
                { ...wizard, friendCode: value.toUpperCase().replaceAll(/[^0-9A-Z]/g, "") },
                [],
            ],
            ChangedEmail: ({ value }) => [{ ...wizard, email: value }, []],
            ChangedVerificationCode: ({ value }) => [{ ...wizard, verificationCode: value }, []],
            SubmittedLinkForm: () => [
                { ...wizard, submitting: true, linkError: Option.none() },
                [RequestCode({ friendCode: wizard.friendCode.trim(), email: wizard.email.trim() })],
            ],
            SucceededRequestCode: ({ email, friendCode }) => [
                {
                    ...wizard,
                    submitting: false,
                    step: "verify",
                    entered: "forward",
                    pendingFriendCode: friendCode,
                    pendingEmail: email,
                    verificationCode: "",
                    verifyError: Option.none(),
                    resend: "idle",
                },
                [FocusInput({ selector: "#verification-code-input" })],
            ],
            FailedRequestCode: () => [
                {
                    ...wizard,
                    submitting: false,
                    linkError: Option.some(
                        "We couldn't reach your tower. Please double-check your friend code and try again."
                    ),
                },
                [],
            ],
            SubmittedVerifyForm: () => [
                { ...wizard, submitting: true, verifyError: Option.none() },
                [
                    VerifyAndLink({
                        friendCode: wizard.pendingFriendCode,
                        verificationCode: wizard.verificationCode.trim(),
                    }),
                ],
            ],
            SucceededVerify: () => [{ ...wizard, verified: true }, []],
            FailedVerify: () => [
                {
                    ...wizard,
                    submitting: false,
                    verifyError: Option.some(
                        "That code didn't work. Please check it and try again, or resend the email."
                    ),
                },
                [],
            ],
            ClickedBack: () => [
                { ...wizard, step: "link", entered: "backward" },
                [FocusInput({ selector: "#friend-code-input" })],
            ],
            ClickedResend: () => [
                { ...wizard, resend: "sending" },
                [ResendCode({ friendCode: wizard.pendingFriendCode, email: wizard.pendingEmail })],
            ],
            SucceededResend: () => [{ ...wizard, resend: "sent" }, [ResendCooldown()]],
            FailedResend: () => [
                {
                    ...wizard,
                    resend: "cooldown",
                    verifyError: Option.some("We couldn't resend the email. Please try again in a moment."),
                },
                [ResendCooldown()],
            ],
            CompletedResendCooldown: () => [{ ...wizard, resend: "idle" }, []],
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

const linkStep = (wizard: WizardModel, h: HtmlBuilder<AppMessage>): Html =>
    h.keyed("section")(
        "link",
        [h.Class(stepClass(wizard))],
        [
            h.form(
                [h.Class("flex flex-col gap-6"), h.OnSubmit(SubmittedLinkForm())],
                [
                    h.label(
                        [h.Class("flex flex-col gap-2")],
                        [
                            fieldLabel(h, "Friend Code"),
                            h.input([
                                h.Id("friend-code-input"),
                                h.Type("text"),
                                h.Attribute("name", "friend-code"),
                                h.Required(true),
                                h.Maxlength(5),
                                h.Pattern("[0-9A-Z]{1,5}"),
                                h.Title("Up to 5 letters or numbers"),
                                h.Placeholder("ABC12"),
                                h.Autocomplete("off"),
                                h.Autocapitalize("characters"),
                                h.Spellcheck(false),
                                h.Value(wizard.friendCode),
                                h.OnInput((value) => ChangedFriendCode({ value })),
                                h.Class(
                                    "font-mono rounded-lg border-2 border-gray-300 bg-white p-3 text-center text-3xl tracking-[0.4em] text-gray-800 uppercase focus:border-sky-blue focus:outline-none"
                                ),
                            ]),
                            fieldHint(h, "You can find it on the Friends tab in TinyTower"),
                        ]
                    ),
                    h.label(
                        [h.Class("flex flex-col gap-2")],
                        [
                            fieldLabel(h, "Cloud Sync Email"),
                            h.input([
                                h.Id("email-input"),
                                h.Type("email"),
                                h.Attribute("name", "email"),
                                h.Required(true),
                                h.Placeholder("you@example.com"),
                                h.Autocomplete("email"),
                                h.Value(wizard.email),
                                h.OnInput((value) => ChangedEmail({ value })),
                                h.Class(
                                    "font-mono rounded-lg border-2 border-gray-300 bg-white p-3 text-xl text-gray-800 focus:border-sky-blue focus:outline-none"
                                ),
                            ]),
                            fieldHint(
                                h,
                                "The email your cloud save is registered with. Nimblebit will send a verification code to it."
                            ),
                        ]
                    ),
                    errorBox(h, wizard.linkError),
                    h.button(
                        [h.Type("submit"), h.Disabled(wizard.submitting), h.Class(submitButtonClass)],
                        [wizard.submitting ? "Sending..." : "Send Verification Code"]
                    ),
                ]
            ),
        ]
    );

const verifyStep = (wizard: WizardModel, h: HtmlBuilder<AppMessage>): Html =>
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
                            "📬 Nimblebit sent a verification code to ",
                            h.strong([h.Class("break-all")], [wizard.pendingEmail]),
                            ". It can take a minute to arrive.",
                        ]
                    ),
                ]
            ),
            h.form(
                [h.Class("flex flex-col gap-6"), h.OnSubmit(SubmittedVerifyForm())],
                [
                    h.label(
                        [h.Class("flex flex-col gap-2")],
                        [
                            fieldLabel(h, "Verification Code"),
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
                                h.OnInput((value) => ChangedVerificationCode({ value })),
                                h.Class(
                                    "font-mono rounded-lg border-2 border-gray-300 bg-white p-3 text-center text-3xl tracking-[0.4em] text-gray-800 focus:border-sky-blue focus:outline-none"
                                ),
                            ]),
                            fieldHint(h, "No email? Check your spam folder"),
                        ]
                    ),
                    errorBox(h, wizard.verifyError),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(wizard.submitting || wizard.verified),
                            h.Class(submitButtonClass),
                        ],
                        [
                            wizard.verified
                                ? "Linked! Redirecting..."
                                : wizard.submitting
                                  ? "Verifying..."
                                  : "Link My Tower",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-6 flex items-center justify-between")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClickedBack()),
                            h.Class("font-mono text-sky-dark cursor-pointer text-lg hover:underline"),
                        ],
                        ["← Go back"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClickedResend()),
                            h.Disabled(wizard.resend !== "idle"),
                            h.Class(
                                "font-mono text-sky-dark cursor-pointer text-lg hover:underline disabled:cursor-not-allowed"
                            ),
                        ],
                        [wizard.resend === "sent" ? "Sent!" : "Resend email"]
                    ),
                ]
            ),
        ]
    );

export const towerLinkView = (h: HtmlBuilder<AppMessage>, wizard: WizardModel): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            appBackLink(h, "/towers/@me", "← My Towers"),
            h.div(
                [h.Class("bg-card-bg shadow-pixel-hover border-gold w-full max-w-md rounded-2xl border-3 p-8")],
                [
                    h.div(
                        [h.Class("mb-6 text-center")],
                        [
                            h.h1([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Link Your Tower"]),
                            h.p(
                                [h.Class("font-mono text-xl text-gray-600")],
                                ["Connect your TinyTower cloud save to start trading with players worldwide"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mb-8 flex items-center gap-3")],
                        [
                            h.div([h.Class("bg-gold h-2 flex-1 rounded-full"), h.AriaHidden(true)], []),
                            h.span(
                                [h.Class("font-pixel shrink-0 text-[0.55rem] text-gray-500")],
                                [wizard.step === "link" ? "Step 1 of 2" : "Step 2 of 2"]
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
                    wizard.step === "link" ? linkStep(wizard, h) : verifyStep(wizard, h),
                ]
            ),
        ]
    );
