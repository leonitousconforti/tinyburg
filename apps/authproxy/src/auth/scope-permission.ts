import type { ApiKey } from "../entity/api-key.js";
import { serverEndpoints } from "@tinyburg/nucleus/contact-server";

export type Scope = keyof typeof serverEndpoints;
export const defaultAllowedScopes: Scope[] = [
    "verifyDevice",
    "registerEmail",
    "pullSave",
    "checkForNewerSave",
    "enteredCurrent",
    "sendItem",
    "getGifts",
    "receiveGift",
    "friendPullMeta",
    "getVisits",
];

export const hasScopePermission = (
    apiKey: ApiKey | undefined,
    nimblebitEndpoint: (typeof serverEndpoints)[Scope]
): boolean => {
    return [...defaultAllowedScopes, ...(apiKey?.privilegedScopes || [])]
        .map((scope: Scope) => serverEndpoints[scope])
        .includes(nimblebitEndpoint);
};
