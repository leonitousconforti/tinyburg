import { Effect, Option } from "effect";

import type { OAuthAuthorizationRequest } from "../domain/models.ts";

import { OIDCRepository } from "../domain/oidc.ts";
import { randomStateGenerator, Sha256CodeChallenge } from "./crypto.ts";

/** Appends OAuth response parameters to a client's registered redirect uri. */
export const authorizationRedirect = (redirectUri: string, params: Record<string, string>): string => {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
};

/**
 * Mints a single-use authorization code for an approved request and returns
 * the redirect back to the client. Only the code's hash is stored; the code
 * itself rides the redirect. None means the request already expired or was
 * already approved.
 */
export const issueAuthorizationCode = (
    request: OAuthAuthorizationRequest,
    userId: string
): Effect.Effect<Option.Option<string>, never, OIDCRepository> =>
    Effect.gen(function* () {
        const code = randomStateGenerator();
        const codeHash = yield* Sha256CodeChallenge(code);
        const approved = yield* OIDCRepository.use((repo) =>
            repo.approveAuthorizationRequest({ requestId: request.id, userId, codeHash })
        ).pipe(Effect.orDie);
        return Option.map(approved, (row) => authorizationRedirect(row.redirectUri, { code, state: row.state }));
    });

export const scopesOf = (scope: string): ReadonlyArray<string> => scope.split(" ").filter((s) => s.length > 0);
