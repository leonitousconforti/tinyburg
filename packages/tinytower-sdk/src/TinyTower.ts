/**
 * Tiny Tower SDK for interacting with Nimblebit's cloud services.
 *
 * @since 1.0.0
 * @category SDK
 */

import type * as Schema from "effect/Schema";
import type * as NimblebitConfig from "./NimblebitConfig.ts";

import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Redacted from "effect/Redacted";
import * as Pako from "pako";

import { Api } from "./internal/nimblebitEndpoints.ts";
import { NimblebitAuth } from "./NimblebitAuth.ts";
import { NimblebitError } from "./NimblebitError.ts";

export const newUser = Effect.gen(function* () {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "PlayerManagementGroup",
        endpoint: "NewUser",
        httpClient,
    });

    const salt1 = yield* nimblebitAuth.salt;
    const salt2 = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${salt1}/${salt2}`);

    const response = yield* endpoint({ path: { salt1, salt2, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "NewUser",
            module: "PlayerManagementGroup",
            cause: response.error,
        });
    }

    return {
        playerId: response.player_id,
        playerSS: response.player_ss,
    };
});

export const playerDetails = Effect.fnUntraced(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "PlayerManagementGroup",
        endpoint: "PlayerDetails",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "PlayerDetails",
            module: "PlayerManagementGroup",
            cause: response.error,
        });
    }

    return response.player;
});

export const verifyDevice = Effect.fnUntraced(function* ({ verificationCode }: { verificationCode: string }) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "PlayerManagementGroup",
        endpoint: "VerifyDevice",
        httpClient,
    });

    const playerId = yield* Effect.map(nimblebitAuth.burnbot, ({ playerId }) => playerId);
    const response = yield* endpoint({ path: { playerId, verificationCode } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "VerifyDevice",
            module: "PlayerManagementGroup",
            cause: response.error,
        });
    }

    return response;
});

export const registerEmail = Effect.fnUntraced(function* ({
    playerEmail,
}: Schema.Schema.Type<NimblebitConfig.UnauthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "PlayerManagementGroup",
        endpoint: "RegisterEmail",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const burnbot = yield* nimblebitAuth.burnbot;

    const hash = yield* nimblebitAuth.sign(
        `tt/${burnbot.playerId}/${salt}${Redacted.value(playerEmail)}${Redacted.value(burnbot.playerAuthKey)}`
    );

    const response = yield* endpoint({
        payload: { email: playerEmail, promote: 1 },
        path: { playerId: burnbot.playerId, salt, hash },
    });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "RegisterEmail",
            module: "PlayerManagementGroup",
            cause: response.error,
        });
    }

    return response.success;
});

export const pullSave = Effect.fnUntraced(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SaveManagementGroup",
        endpoint: "PullSave",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "PullSave",
            module: "SaveGameGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "PullSave",
            module: "SaveGameGroup",
            cause: "Player has no save data",
        });
    }

    const dataAsBase64 = Encoding.encodeBase64(response.data);
    const checksum = yield* nimblebitAuth.sign(
        playerId + salt + response.saveId + dataAsBase64 + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum) {
        return yield* new NimblebitError({
            method: "PullSave",
            module: "SaveGameGroup",
            cause: "Checksum mismatch",
        });
    }

    return {
        ...response,
        data: Pako.inflate(response.data, { to: "string" }),
    };
});

export const enterRaffle = Effect.fnUntraced(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "EnterRaffle",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "EnterRaffle",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    return response.success;
});

export const enterMultiRaffle = Effect.fnUntraced(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "EnterMultiRaffle",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "EnterMultiRaffle",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    return response.success;
});

export const enteredCurrentRaffle = Effect.fnUntraced(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "EnteredCurrent",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "EnteredCurrent",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    return response.success === "Entered";
});
