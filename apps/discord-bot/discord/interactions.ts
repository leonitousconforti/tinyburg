import { Option, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";

/**
 * The slice of Discord's interaction payload this bot reads. Field names are
 * Discord's own snake_case rather than the repo's camelCase, because this is
 * the wire format and renaming it here would only hide what arrived.
 *
 * Unmodelled keys are dropped on decode, which is the point: Discord adds
 * fields to this payload continually and none of them should be able to
 * break `/link`.
 */

/** @see https://discord.com/developers/docs/interactions/receiving-and-responding */
export const InteractionType = {
    Ping: 1,
    ApplicationCommand: 2,
} as const;

const InteractionResponseType = {
    Pong: 1,
    ChannelMessageWithSource: 4,
} as const;

/** Only the invoking user sees the reply. */
const EPHEMERAL = 64;

export const DiscordUser = Schema.Struct({
    id: Schema.String,
    username: Schema.String,
    global_name: Schema.optional(Schema.NullOr(Schema.String)),
});

const CommandOption = Schema.Struct({
    name: Schema.String,
    // Every option this bot declares is a string or a user snowflake, and
    // both arrive as strings.
    value: Schema.optional(Schema.String),
});

const CommandData = Schema.Struct({
    name: Schema.String,
    options: Schema.optional(Schema.Array(CommandOption)),
});

export const Interaction = Schema.Struct({
    type: Schema.Finite,
    /** Authenticates follow-up edits for 15 minutes. Treat as a secret. */
    token: Schema.String,
    data: Schema.optional(CommandData),
    /** Present when invoked in a guild; carries the invoking user. */
    member: Schema.optional(Schema.Struct({ user: DiscordUser })),
    /** Present when invoked in a DM. */
    user: Schema.optional(DiscordUser),
});

export type Interaction = typeof Interaction.Type;

/** Interactions arrive as a signed body, so decode from the raw text. */
export const InteractionFromJson = Schema.fromJsonString(Interaction);

/**
 * Who ran the command. Discord puts the user in different places depending
 * on whether the command came from a guild or a DM, and a payload with
 * neither is one we should refuse rather than guess at.
 */
export const invokingUser = (interaction: Interaction): Option.Option<typeof DiscordUser.Type> =>
    Option.fromUndefinedOr(interaction.member?.user ?? interaction.user);

/** The handshake that proves the endpoint is alive. */
export const pong = HttpServerResponse.jsonUnsafe({ type: InteractionResponseType.Pong });

/**
 * Replies never resolve mentions. `/whois` renders a `<@id>` so Discord
 * shows a name rather than a snowflake, and suppressing the ping keeps that
 * from turning the bot into a way to notify someone who did not ask.
 */
const ALLOWED_MENTIONS = { parse: [] as ReadonlyArray<string> };

/** A reply only the invoking user can see. */
export const ephemeral = (content: string) =>
    HttpServerResponse.jsonUnsafe({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content, flags: EPHEMERAL, allowed_mentions: ALLOWED_MENTIONS },
    });

/**
 * An ephemeral reply carrying a link button.
 *
 * A button rather than a bare URL because the authorization link is
 * single-use and bearer-ish: anyone who completes it binds *their* Tinyburg
 * account to the Discord account that ran the command. Ephemeral delivery
 * keeps it out of the channel, and a button discourages copying it out.
 */
export const ephemeralWithLink = (options: {
    readonly content: string;
    readonly label: string;
    readonly url: string;
}) =>
    HttpServerResponse.jsonUnsafe({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: options.content,
            flags: EPHEMERAL,
            allowed_mentions: ALLOWED_MENTIONS,
            components: [
                {
                    type: 1, // action row
                    components: [{ type: 2, style: 5, label: options.label, url: options.url }],
                },
            ],
        },
    });
