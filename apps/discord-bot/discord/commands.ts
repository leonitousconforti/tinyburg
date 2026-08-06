/**
 * The bot's command surface, as Discord needs it declared.
 *
 * This slice is identity only: bind a Discord account to a Tinyburg account,
 * show what is bound, and undo it. Anything that reads a tower needs a
 * second consent (`towers:read`) that `/link` deliberately does not ask for.
 *
 * `contexts` and `integration_types` let the commands run in a guild, in the
 * bot's DMs, or as a user-installed app, so someone can link privately
 * without a server admin having to install anything.
 */

const CHAT_INPUT = 1;
const USER_OPTION = 6;

/** Guild install and user install. */
const INTEGRATION_TYPES = [0, 1];

/** Guild, bot DM, and private channels. */
const CONTEXTS = [0, 1, 2];

export const COMMANDS = [
    {
        name: "link",
        type: CHAT_INPUT,
        description: "Link your Tinyburg account to this Discord account",
        integration_types: INTEGRATION_TYPES,
        contexts: CONTEXTS,
    },
    {
        name: "unlink",
        type: CHAT_INPUT,
        description: "Unlink your Tinyburg account from this Discord account",
        integration_types: INTEGRATION_TYPES,
        contexts: CONTEXTS,
    },
    {
        name: "whois",
        type: CHAT_INPUT,
        description: "Show which Tinyburg account a Discord user has linked",
        integration_types: INTEGRATION_TYPES,
        contexts: CONTEXTS,
        options: [
            {
                name: "user",
                type: USER_OPTION,
                description: "Whose link to look up. Defaults to you.",
                required: false,
            },
        ],
    },
] as const;
