/**
 * The Tinyburg SPA is itself an OAuth client of the Tinyburg provider - a
 * public one, with no secret, authenticating with PKCE. Its id is fixed so
 * the browser bundle, the provider, and the seed migration can all name the
 * same registration without a round trip.
 *
 * Being first party buys exactly one privilege: no consent screen. Asking a
 * visitor to authorize Tinyburg to use Tinyburg would be noise. Every other
 * client is prompted on every authorization.
 */
export const FIRST_PARTY_CLIENT_ID = "6f1f38d3-b1c2-4f97-9f0e-8b2f9c3f5a10";

export const FIRST_PARTY_REDIRECT_PATH = "/auth/callback";
