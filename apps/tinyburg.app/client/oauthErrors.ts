/**
 * The oauth callback reports how it went in an `error` query parameter, on
 * `/login` for a sign in and on `/account` for connecting another provider.
 *
 * The server distinguishes far more cases than a visitor can act on, because
 * the code is also what tells us which stage broke. This collapses them to the
 * three outcomes that lead to different advice; the pages supply their own
 * wording, since "sign in" and "connect an account" do not read the same.
 */
export type OAuthProblem =
    /** They chose not to go through with it. Nothing is wrong. */
    | "denied"
    /** The ten minute window closed, cookies were blocked, or the flow never started in this browser. */
    | "expired"
    /** Anything else, all of which amounts to "try again". */
    | "failed";

/** Codes that mean the round trip lost its footing rather than genuinely failing. */
const expired = new Set(["invalid_oauth_intent", "invalid_oauth_cookies", "invalid_oauth_callback"]);

export const classifyOAuthError = (error: string): OAuthProblem => {
    if (error === "oauth_denied") return "denied";
    if (expired.has(error)) return "expired";
    return "failed";
};
