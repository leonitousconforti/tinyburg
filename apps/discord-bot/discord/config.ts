import { Config } from "effect";

/**
 * The bot's own identity at Discord.
 *
 * Note what is missing: the bot token. Serving interactions never needs it.
 * Discord signs every request it sends us (`verify.ts`), and follow-up edits
 * authenticate with the interaction token that arrives in the request body.
 * The bot token is only needed to *register* commands, so it lives in
 * `scripts/registerCommands.ts` and never in the long-running process.
 */
export const discordConfig = Config.all({
    /** Used to address follow-up edits at the interaction webhook. */
    applicationId: Config.string("DISCORD_APPLICATION_ID"),

    /** Ed25519 public key, hex, from the Discord developer portal. */
    publicKey: Config.string("DISCORD_PUBLIC_KEY"),
});
