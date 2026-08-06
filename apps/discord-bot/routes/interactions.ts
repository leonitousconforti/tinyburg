import { Effect, Layer, Option, Result, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

import type { Interaction } from "../discord/interactions.ts";

import { Oidc } from "effect-oidc";

import { randomSecret, sha256 } from "../crypto.ts";
import { discordConfig } from "../discord/config.ts";
import {
    ephemeral,
    ephemeralWithLink,
    InteractionFromJson,
    InteractionType,
    invokingUser,
    pong,
} from "../discord/interactions.ts";
import { parsePublicKey, verifyInteraction } from "../discord/verify.ts";
import { LinksRepository } from "../domain/links.ts";
import { LINK_SCOPES, tinyburgConfig } from "../tinyburg.ts";

/**
 * Discord expects exactly 401 when a signature does not check out, and probes
 * for it before it will accept the endpoint at all.
 */
const unauthorized = HttpServerResponse.text("invalid request signature", { status: 401 });

/** What a handler says when it does not want to explain itself. */
const somethingWentWrong = ephemeral("Something went wrong. Try again in a minute.");

const beginLink = (options: {
    readonly interaction: Interaction;
    readonly discordUserId: string;
    readonly issuer: string;
    readonly clientId: string;
    readonly redirectUri: string;
}) =>
    Effect.gen(function* () {
        const existing = yield* LinksRepository.use((repo) => repo.findLinkByDiscordUserId(options.discordUserId));
        if (Option.isSome(existing)) {
            const name = Option.getOrElse(existing.value.displayName, () => "a Tinyburg account");
            return ephemeral(`This Discord account is already linked to **${name}**. Run \`/unlink\` first.`);
        }

        const state = randomSecret();
        const codeVerifier = randomSecret();

        const authorizationRequest = Oidc.authorizationRequest({
            authorizationEndpoint: `${options.issuer}/oauth/authorize`,
            clientId: options.clientId,
            redirectUri: options.redirectUri,
            scopes: LINK_SCOPES,
            state,
            codeChallenge: yield* sha256(codeVerifier),
        });

        const authorizationUrl = Url.make(
            authorizationRequest.url,
            authorizationRequest.urlParams,
            authorizationRequest.hash.valueOrUndefined
        ).pipe(Result.getOrThrow);

        const stateHash = yield* sha256(state);

        // Persist before replying. If the row is not there when the browser
        // comes back, the callback has no way to learn who asked for it, and
        // a fast enough round trip would otherwise lose the race.
        yield* LinksRepository.use((repo) =>
            repo.beginLink({
                stateHash,
                codeVerifier,
                discordUserId: options.discordUserId,
                interactionToken: options.interaction.token,
            })
        );

        return ephemeralWithLink({
            content: [
                "Sign in at tinyburg.app to link your account. This link works once and expires in 10 minutes.",
                "",
                "It only asks to confirm who you are: your towers stay private until you grant that separately.",
            ].join("\n"),
            label: "Link my Tinyburg account",
            url: authorizationUrl.href,
        });
    });

const whois = (options: { readonly interaction: Interaction; readonly invokerId: string }) =>
    Effect.gen(function* () {
        const target = Option.fromUndefinedOr(
            options.interaction.data?.options?.find((option) => option.name === "user")?.value
        ).pipe(Option.getOrElse(() => options.invokerId));

        const link = yield* LinksRepository.use((repo) => repo.findLinkByDiscordUserId(target));
        const subject = target === options.invokerId ? "You have" : `<@${target}> has`;

        if (Option.isNone(link)) {
            const hint = target === options.invokerId ? " Run `/link` to connect one." : "";
            return ephemeral(`${subject} not linked a Tinyburg account.${hint}`);
        }

        const name = Option.getOrElse(link.value.displayName, () => "a Tinyburg account");
        return ephemeral(`${subject} linked **${name}**.`);
    });

const unlink = (discordUserId: string) =>
    Effect.gen(function* () {
        const removed = yield* LinksRepository.use((repo) => repo.deleteLinkByDiscordUserId(discordUserId));

        return Option.isNone(removed)
            ? ephemeral("This Discord account is not linked to a Tinyburg account.")
            : ephemeral("Unlinked. Your Tinyburg account no longer answers to this Discord account.");
    });

export const InteractionRoutesLive = Effect.gen(function* () {
    const discord = yield* discordConfig;
    const tinyburg = yield* tinyburgConfig;

    // A bot that cannot verify signatures cannot serve a single interaction,
    // so a malformed key is a boot failure rather than a runtime surprise.
    const maybePublicKey = parsePublicKey(discord.publicKey);
    if (Option.isNone(maybePublicKey)) {
        return yield* Effect.die("DISCORD_PUBLIC_KEY is not a 32 byte hex Ed25519 key");
    }
    const publicKey = maybePublicKey.value;

    const dispatch = (interaction: Interaction) =>
        Effect.gen(function* () {
            if (interaction.type === InteractionType.Ping) {
                return pong;
            }
            if (interaction.type !== InteractionType.ApplicationCommand) {
                return ephemeral("I do not know how to handle that yet.");
            }

            const user = invokingUser(interaction);
            if (Option.isNone(user)) {
                return somethingWentWrong;
            }

            const discordUserId = user.value.id;

            switch (interaction.data?.name) {
                case "link": {
                    return yield* beginLink({
                        interaction,
                        discordUserId,
                        issuer: tinyburg.issuer,
                        clientId: tinyburg.clientId,
                        redirectUri: tinyburg.redirectUri,
                    });
                }
                case "whois": {
                    return yield* whois({ interaction, invokerId: discordUserId });
                }
                case "unlink": {
                    return yield* unlink(discordUserId);
                }
                default: {
                    return ephemeral(`I do not have a \`${interaction.data?.name ?? "that"}\` command.`);
                }
            }
        }).pipe(
            Effect.tapError((error) => Effect.logError(`interaction ${interaction.type} failed`, error)),
            Effect.orElseSucceed(() => somethingWentWrong),
            Effect.tapDefect((defect) => Effect.logError(`interaction ${interaction.type} died`, defect)),
            Effect.catchDefect(() => Effect.succeed(somethingWentWrong))
        );

    const handler = Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;

        const signatureHex = request.headers["x-signature-ed25519"];
        const timestamp = request.headers["x-signature-timestamp"];
        if (signatureHex === undefined || timestamp === undefined) {
            return unauthorized;
        }

        // The signature covers the bytes as sent, so the raw text is what has
        // to be verified. Anything parsed and re-serialized would be a
        // different string than the one Discord signed.
        const rawBody = yield* request.text.pipe(Effect.option);
        if (Option.isNone(rawBody)) {
            return unauthorized;
        }

        const verified = yield* verifyInteraction({
            publicKey,
            signatureHex,
            timestamp,
            rawBody: rawBody.value,
        });
        if (!verified) {
            return unauthorized;
        }

        // Only now is this a message from Discord rather than from anyone.
        const interaction = yield* Schema.decodeEffect(InteractionFromJson)(rawBody.value).pipe(Effect.option);
        if (Option.isNone(interaction)) {
            return HttpServerResponse.text("unrecognised interaction", { status: 400 });
        }

        return yield* dispatch(interaction.value);
    }).pipe(Effect.satisfiesErrorType<never>());

    return HttpRouter.add("POST", "/discord/interactions", handler);
}).pipe(Layer.unwrap);
