import { Encoding, Result } from "effect";

const DEFAULT_DESTINATION = "/towers/@me";

/** Post-login destinations must be local absolute paths, never off-site. */
export const sanitizeReturnTo = (returnTo: string | null): string | undefined =>
    returnTo !== null && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
        ? returnTo
        : undefined;

/** Where to land after login: the sanitized returnTo, or the user's tower. */
export const postLoginDestination = (returnTo: string | null): string =>
    sanitizeReturnTo(returnTo) ?? DEFAULT_DESTINATION;

/**
 * The post-login destination rides inside the OAuth state parameter, which
 * already round-trips through the provider and is integrity-checked against
 * the state cookie. Base64url contains no ".", keeping the separator
 * unambiguous after the random hex prefix. Off-site destinations are dropped
 * here, so callers may pass the raw query parameter.
 */
export const stateWithReturnTo = (state: string, returnTo: string | null): string => {
    const destination = sanitizeReturnTo(returnTo);
    return destination === undefined ? state : `${state}.${Encoding.encodeBase64Url(destination)}`;
};

export const destinationFromState = (state: string): string => {
    const separator = state.indexOf(".");
    if (separator === -1) return DEFAULT_DESTINATION;
    const decoded = Encoding.decodeBase64UrlString(state.slice(separator + 1));
    return Result.isSuccess(decoded) ? postLoginDestination(decoded.success) : DEFAULT_DESTINATION;
};
