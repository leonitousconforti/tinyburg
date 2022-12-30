import type { ApiKey } from "../entity/ApiKey.js";
import { serverEndpoints } from "@tinyburg/core/contact-server.js";

export type Scope = keyof typeof serverEndpoints;
export const defaultAllowedScopes: Scope[] = [
    "verify_device",
    "register_email",
    "pull_save",
    "check_for_newer_save",
    "entered_current",
    "send_item",
    "get_gifts",
    "receive_gift",
    "friend_pull_meta",
    "get_visits",
];

export const hasScopePermission = (
    apiKey: ApiKey | undefined,
    nimblebitEndpoint: typeof serverEndpoints[Scope]
): boolean => {
    return defaultAllowedScopes
        .concat(apiKey?.privilegedScopes || [])
        .map((scope) => serverEndpoints[scope])
        .includes(nimblebitEndpoint);
};
