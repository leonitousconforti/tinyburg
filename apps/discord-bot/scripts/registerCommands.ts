import { Config, Effect, Redacted } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";

import { NodeRuntime } from "@effect/platform-node";

import { COMMANDS } from "../discord/commands.ts";

/**
 * Publishes the command list to Discord.
 *
 * Run this by hand after changing `discord/commands.ts`, not on boot: a PUT
 * replaces the whole global command set, and doing that on every deploy of
 * every replica would be a lot of writes against a heavily rate limited
 * endpoint for something that changes a few times a year.
 *
 * This is the only place the bot token is used. The interactions server
 * never needs it, so it should not be in that process's environment.
 */
const program = Effect.gen(function* () {
    const applicationId = yield* Config.string("DISCORD_APPLICATION_ID");
    const botToken = yield* Config.redacted("DISCORD_BOT_TOKEN");

    const response = yield* HttpClientRequest.put(
        `https://discord.com/api/v10/applications/${applicationId}/commands`
    ).pipe(
        HttpClientRequest.setHeader("authorization", `Bot ${Redacted.value(botToken)}`),
        HttpClientRequest.bodyJsonUnsafe(COMMANDS),
        HttpClient.execute
    );

    if (response.status !== 200) {
        const body = yield* response.text;
        return yield* Effect.die(`Discord refused the command list (${response.status}): ${body}`);
    }

    yield* Effect.logInfo(`registered ${COMMANDS.length} commands: ${COMMANDS.map((c) => c.name).join(", ")}`);
}).pipe(Effect.provide(FetchHttpClient.layer));

NodeRuntime.runMain(program);
