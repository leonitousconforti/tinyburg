import { Effect, Layer, Option, Result } from "effect";
import { Url } from "effect/unstable/http";

import { fromDiscordLocale } from "@tinyburg/i18n";
import { Discord, Ix, UI } from "dfx";
import { InteractionsRegistry } from "dfx/gateway";
import { Oidc } from "effect-oidc";

import { randomSecret, sha256 } from "./crypto.ts";
import { LinksRepository } from "./domain/links.ts";
import { botMessagesFor } from "./messages.ts";
import { LINK_SCOPES, tinyburgConfig } from "./tinyburg.ts";

/**
 * The bot's command surface.
 *
 * This slice is identity only: bind a Discord account to a Tinyburg account,
 * show what is bound, and undo it. Anything that reads a tower needs a second
 * consent (`towers:read`) that `/link` deliberately does not ask for.
 *
 * `contexts` and `integration_types` let the commands run in a guild, in the
 * bot's DMs, or as a user-installed app, so someone can link privately
 * without a server admin having to install anything.
 *
 * Replies are localized from `interaction.locale`; the command names and
 * descriptions below deliberately stay English. Discord localizes those
 * through its own `name_localizations` / `description_localizations`
 * registration fields, which are out of scope here.
 */

const INTEGRATION_TYPES = [
    Discord.ApplicationIntegrationType.GUILD_INSTALL,
    Discord.ApplicationIntegrationType.USER_INSTALL,
];

const CONTEXTS = [
    Discord.InteractionContextType.GUILD,
    Discord.InteractionContextType.BOT_DM,
    Discord.InteractionContextType.PRIVATE_CHANNEL,
];

/**
 * Replies are ephemeral, and never resolve mentions. `/whois` renders a
 * `<@id>` so Discord shows a name rather than a snowflake, and suppressing
 * the ping keeps that from turning the bot into a way to notify someone who
 * did not ask.
 */
const ephemeral = (content: string) =>
    Ix.response({
        type: Discord.InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content,
            flags: Discord.MessageFlags.Ephemeral,
            allowed_mentions: { parse: [] },
        },
    });

/**
 * An ephemeral reply carrying a link button.
 *
 * A button rather than a bare URL because the authorization link is
 * single-use and bearer-ish: anyone who completes it binds *their* Tinyburg
 * account to the Discord account that ran the command. Ephemeral delivery
 * keeps it out of the channel, and a button discourages copying it out.
 */
const ephemeralWithLink = (options: { readonly content: string; readonly label: string; readonly url: string }) =>
    Ix.response({
        type: Discord.InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: options.content,
            flags: Discord.MessageFlags.Ephemeral,
            allowed_mentions: { parse: [] },
            components: [
                UI.row([UI.button({ style: Discord.ButtonStyleTypes.LINK, label: options.label, url: options.url })]),
            ],
        },
    });

/**
 * Who ran the command. Discord puts the user in different places depending on
 * whether the command came from a guild or a DM, and an interaction with
 * neither is one to refuse rather than guess at.
 */
const invokingUserId = Effect.map(Ix.Interaction, (interaction) =>
    Option.fromNullishOr(interaction.member?.user.id ?? interaction.user?.id)
);

/**
 * What language to reply in. Discord guarantees `locale` on every
 * application command interaction; the `in` check only narrows away the PING
 * interaction, whose type omits the field and which never reaches a handler.
 */
const interactionMessages = Effect.map(
    Ix.Interaction,
    (interaction) => botMessagesFor[fromDiscordLocale("locale" in interaction ? interaction.locale : undefined)]
);

export const InteractionsLive = Layer.effectDiscard(
    Effect.gen(function* () {
        const registry = yield* InteractionsRegistry;
        const tinyburg = yield* tinyburgConfig;

        // Resolved here rather than inside the handlers: dfx registers an
        // interaction builder whose requirements are already `never`, so the
        // repository has to be a value the handlers close over.
        const links = yield* LinksRepository;

        const link = Ix.global(
            {
                name: "link",
                description: "Link your Tinyburg account to this Discord account",
                integration_types: INTEGRATION_TYPES,
                contexts: CONTEXTS,
            },
            Effect.gen(function* () {
                const messages = yield* interactionMessages;
                const discordUserId = yield* invokingUserId;
                if (Option.isNone(discordUserId)) {
                    return ephemeral(messages.unknownInvoker);
                }

                const existing = yield* links.findLinkByDiscordUserId(discordUserId.value);
                if (Option.isSome(existing)) {
                    const name = Option.getOrElse(existing.value.displayName, () => messages.fallbackAccountName);
                    return ephemeral(messages.alreadyLinked(name));
                }

                const state = randomSecret();
                const codeVerifier = randomSecret();

                const authorizationRequest = Oidc.authorizationRequest({
                    authorizationEndpoint: `${tinyburg.issuer}/oauth/authorize`,
                    clientId: tinyburg.clientId,
                    redirectUri: tinyburg.redirectUri,
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

                // Persist before replying. If the row is not there when the
                // browser comes back, the callback has no way to learn who
                // asked for it, and a fast enough round trip would otherwise
                // lose the race.
                yield* links.beginLink({
                    stateHash,
                    codeVerifier,
                    discordUserId: discordUserId.value,
                    interactionToken: yield* Effect.map(Ix.Interaction, (interaction) => interaction.token),
                });

                return ephemeralWithLink({
                    content: messages.linkPrompt,
                    label: messages.linkButtonLabel,
                    url: authorizationUrl.href,
                });
            })
        );

        const whois = Ix.global(
            {
                name: "whois",
                description: "Show which Tinyburg account a Discord user has linked",
                integration_types: INTEGRATION_TYPES,
                contexts: CONTEXTS,
                options: [
                    {
                        name: "user",
                        type: Discord.ApplicationCommandOptionType.USER,
                        description: "Whose link to look up. Defaults to you.",
                        required: false,
                    },
                ],
            },
            (context) =>
                Effect.gen(function* () {
                    const messages = yield* interactionMessages;
                    const invokerId = yield* invokingUserId;
                    if (Option.isNone(invokerId)) {
                        return ephemeral(messages.unknownInvoker);
                    }

                    const target = context.optionValueOptional("user").pipe(Option.getOrElse(() => invokerId.value));
                    const askingAboutSelf = target === invokerId.value;

                    const found = yield* links.findLinkByDiscordUserId(target);
                    if (Option.isNone(found)) {
                        return ephemeral(
                            askingAboutSelf ? messages.whoisSelfNotLinked : messages.whoisOtherNotLinked(`<@${target}>`)
                        );
                    }

                    const name = Option.getOrElse(found.value.displayName, () => messages.fallbackAccountName);
                    return ephemeral(
                        askingAboutSelf
                            ? messages.whoisSelfLinked(name)
                            : messages.whoisOtherLinked(`<@${target}>`, name)
                    );
                })
        );

        const unlink = Ix.global(
            {
                name: "unlink",
                description: "Unlink your Tinyburg account from this Discord account",
                integration_types: INTEGRATION_TYPES,
                contexts: CONTEXTS,
            },
            Effect.gen(function* () {
                const messages = yield* interactionMessages;
                const discordUserId = yield* invokingUserId;
                if (Option.isNone(discordUserId)) {
                    return ephemeral(messages.unknownInvoker);
                }

                const removed = yield* links.deleteLinkByDiscordUserId(discordUserId.value);

                return Option.isNone(removed) ? ephemeral(messages.notLinked) : ephemeral(messages.unlinked);
            })
        );

        // A handler that fails has already lost its chance to reply, so the
        // most it can do is say so in the log rather than take the gateway
        // connection down with it.
        const ix = Ix.builder.add(link).add(whois).add(unlink).catchAllCause(Effect.logError);

        yield* registry.register(ix);
    })
);
