import { Config, Effect, Layer, Option, Redacted, Ref, Schema } from "effect";
import { HttpClient, HttpRouter, HttpServerRequest } from "effect/unstable/http";

import type { Jwt } from "effect-oidc";

import { type Language, fromAcceptLanguage } from "@tinyburg/shared-ui/Internationalization";
import { DiscordREST } from "dfx";
import { Oidc } from "effect-oidc";

import { sha256 } from "../crypto.ts";
import { LinksRepository } from "../domain/links.ts";
import { botMessagesFor } from "../messages.ts";
import * as ResultPage from "../pages/result.ts";
import { TinyburgClient } from "../tinyburg.ts";

/**
 * Where the browser lands after authorizing at tinyburg.app.
 *
 * Unlike a browser sign-in, nothing here is anchored by a cookie: the person
 * who ran `/link` may well finish the round trip on their phone. The `state`
 * is therefore the whole binding, which is why it is 384 bits, single use,
 * stored only as a hash, and dead after ten minutes.
 *
 * The consequence worth being clear about: whoever completes this URL gets
 * bound to the Discord account that started it. That is inherent to linking
 * an account from a chat client, and it is why `/link` replies ephemerally,
 * so the URL is never posted where someone else can take it.
 */

/**
 * One outcome, as a response.
 *
 * The title and body are handed over as plain text; `pages/result.ts` renders
 * them, which is also what escapes them. That matters for `linked` below, whose
 * body names a Tinyburg display name its owner chose.
 */
const page = (options: {
    readonly language: Language;
    readonly title: string;
    readonly body: string;
    readonly status: number;
}) => ResultPage.respond({ language: options.language, title: options.title, body: options.body }, options.status);

const linked = (language: Language, name: string) =>
    page({
        language,
        title: botMessagesFor[language].linkedTitle,
        body: botMessagesFor[language].linkedBody(name),
        status: 200,
    });

/**
 * Every failure says the same thing.
 *
 * The distinctions available here - no such state, expired state, the
 * provider refused - are all things an attacker probing callback URLs would
 * like to learn, and none of them are things the person in front of the page
 * can act on differently. The detail goes to the log instead.
 *
 * Functions of the language rather than module constants: a constant would
 * bake the default language in at module load.
 */
const failed = (language: Language) =>
    page({
        language,
        title: botMessagesFor[language].failedTitle,
        body: botMessagesFor[language].failedBody,
        status: 400,
    });

const cancelled = (language: Language) =>
    page({
        language,
        title: botMessagesFor[language].cancelledTitle,
        body: botMessagesFor[language].cancelledBody,
        status: 200,
    });

export const CallbackRoutesLive = Effect.gen(function* () {
    const tinyburg = yield* TinyburgClient;
    const httpClient = yield* HttpClient.HttpClient;

    // Reporting back into Discord goes through dfx's REST client, so the
    // follow-up edit inherits its rate limiting rather than racing it.
    const rest = yield* DiscordREST;
    const applicationId = yield* Config.string("APPLICATION_ID");

    // The provider's signing keys, cached with a last-good fallback so a
    // hiccup fetching them does not read as a failed link.
    const cachedJwks = yield* Effect.flatMap(
        Ref.make(Option.none<Schema.Schema.Type<typeof Jwt.JwksSchema>>()),
        (lastGood) =>
            Oidc.fetchJwks(`${tinyburg.issuer}/.well-known/jwks.json`).pipe(
                Effect.provideService(HttpClient.HttpClient, httpClient),
                Effect.tap((jwks) => Ref.set(lastGood, Option.some(jwks))),
                Effect.catch((error) =>
                    Ref.get(lastGood).pipe(
                        Effect.flatMap(
                            Option.match({
                                onNone: () => Effect.fail(error),
                                onSome: Effect.succeed,
                            })
                        )
                    )
                ),
                Effect.cachedInvalidateWithTTL("10 minutes"),
                Effect.map(([cached, invalidate]) => Effect.tapError(cached, () => invalidate))
            )
    );

    const handleCallback = (language: Language) =>
        Effect.gen(function* () {
            const messages = botMessagesFor[language];
            const refuse = (reason: string) =>
                Effect.andThen(Effect.logInfo(`link callback refused: ${reason}`), failed(language));

            const maybeUrlParams = yield* HttpServerRequest.schemaSearchParams(
                Schema.Union([
                    Schema.Struct({ error: Schema.String }),
                    Schema.Struct({ code: Schema.String, state: Schema.String }),
                ])
            ).pipe(Effect.option);
            if (Option.isNone(maybeUrlParams)) {
                return yield* refuse("malformed callback");
            }

            const urlParams = maybeUrlParams.value;
            if ("error" in urlParams) {
                return urlParams.error === "access_denied"
                    ? yield* cancelled(language)
                    : yield* refuse(urlParams.error);
            }

            // Claiming the pending link consumes it, so a replayed URL gets
            // nothing even if the code were somehow still good.
            const stateHash = yield* sha256(urlParams.state);
            const maybePending = yield* LinksRepository.use((repo) => repo.claimPendingLink(stateHash)).pipe(
                Effect.option,
                Effect.map(Option.flatten)
            );
            if (Option.isNone(maybePending)) {
                return yield* refuse("no pending link for this state");
            }
            const pending = maybePending.value;

            const maybeToken = yield* Oidc.exchangeAuthorizationCode({
                tokenEndpoint: `${tinyburg.issuer}/oauth/token`,
                clientId: tinyburg.clientId,
                clientSecret: Option.map(tinyburg.clientSecret, Redacted.value).pipe(Option.getOrUndefined),
                redirectUri: tinyburg.redirectUri,
                code: urlParams.code,
                codeVerifier: pending.codeVerifier,
            }).pipe(Effect.option);
            if (Option.isNone(maybeToken)) {
                return yield* refuse("token exchange failed");
            }

            // The id token is the only thing that says who authorized. The access
            // token is deliberately dropped on the floor: this slice reads
            // nothing from the trading api, so keeping it would be holding a
            // capability with no use for it.
            const maybeClaims = yield* cachedJwks.pipe(
                Effect.flatMap((jwks) =>
                    Oidc.verifyIdToken({
                        jwks,
                        clientId: tinyburg.clientId,
                        issuer: tinyburg.issuer,
                        idToken: maybeToken.value.id_token ?? "",
                    })
                ),
                Effect.option
            );
            if (Option.isNone(maybeClaims)) {
                return yield* refuse("id token did not verify");
            }
            const claims = maybeClaims.value;

            const maybeLink = yield* LinksRepository.use((repo) =>
                repo.upsertLink({
                    discordUserId: pending.discordUserId,
                    sub: claims.sub,
                    displayName: claims.name ?? null,
                    avatarUrl: claims.picture ?? null,
                })
            ).pipe(Effect.option);
            if (Option.isNone(maybeLink)) {
                return yield* refuse("could not store the link");
            }

            const name = Option.getOrElse(maybeLink.value.displayName, () => messages.fallbackYourAccountName);

            // Best effort: rewrite the ephemeral reply so the confirmation shows
            // up in Discord too, retiring the spent authorization button with it.
            // The link is already made either way, so a failure here is worth a
            // log and nothing more. The Discord locale is not stored with the
            // pending link, so the browser's language is the best proxy for the
            // person who ran /link - they are the same person by construction.
            yield* rest
                .updateOriginalWebhookMessage(applicationId, pending.interactionToken, {
                    payload: { content: messages.linkedFollowUp(name), components: [] },
                })
                .pipe(
                    Effect.tapError((error) => Effect.logWarning("could not update the /link reply", error)),
                    Effect.ignore
                );

            return yield* linked(language, name);
        }).pipe(
            Effect.tapDefect((defect) => Effect.logError("link callback died", defect)),
            Effect.catchDefect(() => failed(language))
        );

    // A browser context, not a Discord one: the person may finish the round
    // trip on a different device, so the page language is negotiated from
    // Accept-Language rather than from the interaction's stored locale.
    const callback = Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        return yield* handleCallback(fromAcceptLanguage(request.headers["accept-language"]));
    }).pipe(Effect.satisfiesErrorType<never>());

    return HttpRouter.add("GET", "/discord/callback", callback);
}).pipe(Layer.unwrap);
