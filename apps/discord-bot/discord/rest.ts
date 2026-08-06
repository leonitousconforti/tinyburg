import { Effect } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Rewrite the ephemeral reply `/link` posted, once the browser round trip
 * has finished.
 *
 * The interaction token authenticates this by itself, so no bot token is
 * involved. It is valid for 15 minutes, which is comfortably longer than the
 * 10 minute window a pending link lives for, so a link that completes at all
 * can always be reported back into Discord.
 *
 * Clearing `components` retires the spent authorization button, so the reply
 * cannot be clicked a second time into a link that no longer exists.
 */
export const editOriginalResponse = (options: {
    readonly applicationId: string;
    readonly interactionToken: string;
    readonly content: string;
}): Effect.Effect<void, unknown, HttpClient.HttpClient> =>
    HttpClientRequest.patch(
        `${DISCORD_API}/webhooks/${options.applicationId}/${options.interactionToken}/messages/@original`
    ).pipe(
        HttpClientRequest.bodyJsonUnsafe({ content: options.content, components: [] }),
        HttpClient.execute,
        Effect.asVoid
    );
