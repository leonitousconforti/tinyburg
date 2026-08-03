import { Effect, Layer, Option } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { DevelopersRepository } from "../../domain/developers.ts";
import { OIDCRepository } from "../../domain/oidc.ts";
import { SessionsRepository } from "../../domain/sessions.ts";
import { TinyburgApi } from "../../shared/api.ts";
import { authorizationRedirect, issueAuthorizationCode, scopesOf } from "../grants.ts";
import { currentAccount } from "../session.ts";

const SessionGroupLive = HttpApiBuilder.group(
    TinyburgApi,
    "SessionGroup",
    Effect.fnUntraced(function* (handlers) {
        const sessions = yield* SessionsRepository;
        const provideSessions = Effect.provideService(SessionsRepository, sessions);

        return handlers.handle(
            "me",
            Effect.fnUntraced(function* () {
                const maybeAccount = yield* currentAccount;
                if (Option.isNone(maybeAccount)) return yield* new HttpApiError.Unauthorized();
                const { user } = maybeAccount.value;
                return {
                    id: user.id,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt,
                };
            }, provideSessions)
        );
    })
);

const DevelopersGroupLive = HttpApiBuilder.group(
    TinyburgApi,
    "DevelopersGroup",
    Effect.fnUntraced(function* (handlers) {
        const sessions = yield* SessionsRepository;
        const developers = yield* DevelopersRepository;
        const provideRepos = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
            effect.pipe(
                Effect.provideService(SessionsRepository, sessions),
                Effect.provideService(DevelopersRepository, developers)
            );

        return handlers.handle(
            "listApps",
            Effect.fnUntraced(function* () {
                const maybeAccount = yield* currentAccount;
                if (Option.isNone(maybeAccount)) return yield* new HttpApiError.Unauthorized();
                const { user } = maybeAccount.value;

                const clients = yield* DevelopersRepository.use((repo) => repo.listOAuthClients(user.id)).pipe(
                    Effect.orDie
                );
                return [...clients]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((client) => ({
                        id: client.id,
                        name: client.name,
                        redirectUris: client.redirectUris,
                        scope: client.scope,
                        createdAt: client.createdAt,
                    }));
            }, provideRepos)
        );
    })
);

const ConsentGroupLive = HttpApiBuilder.group(
    TinyburgApi,
    "ConsentGroup",
    Effect.fnUntraced(function* (handlers) {
        const sessions = yield* SessionsRepository;
        const developers = yield* DevelopersRepository;
        const oidc = yield* OIDCRepository;
        const provideRepos = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
            effect.pipe(
                Effect.provideService(SessionsRepository, sessions),
                Effect.provideService(DevelopersRepository, developers),
                Effect.provideService(OIDCRepository, oidc)
            );

        // The pending, unexpired request, but only for the user it belongs to
        const requestFor = Effect.fnUntraced(function* (requestId: string, userId: string) {
            const maybeRequest = yield* OIDCRepository.use((repo) => repo.findAuthorizationRequest(requestId)).pipe(
                Effect.orDie
            );
            if (Option.isNone(maybeRequest) || maybeRequest.value.userId !== userId) {
                return yield* new HttpApiError.NotFound();
            }
            return maybeRequest.value;
        });

        return handlers
            .handle(
                "prompt",
                Effect.fnUntraced(function* ({ params }) {
                    const maybeAccount = yield* currentAccount;
                    if (Option.isNone(maybeAccount)) return yield* new HttpApiError.Unauthorized();
                    const request = yield* requestFor(params.requestId, maybeAccount.value.user.id);

                    const maybeClient = yield* DevelopersRepository.use((repo) =>
                        repo.findOAuthClient(request.clientId)
                    ).pipe(Effect.orDie);
                    if (Option.isNone(maybeClient)) return yield* new HttpApiError.NotFound();

                    return {
                        clientName: maybeClient.value.name,
                        scopes: scopesOf(request.scope),
                        redirectUri: request.redirectUri,
                    };
                }, provideRepos)
            )
            .handle(
                "decide",
                Effect.fnUntraced(function* ({ params, payload }) {
                    const maybeAccount = yield* currentAccount;
                    if (Option.isNone(maybeAccount)) return yield* new HttpApiError.Unauthorized();
                    const user = maybeAccount.value.user;
                    const request = yield* requestFor(params.requestId, user.id);

                    if (!payload.approve) {
                        yield* OIDCRepository.use((repo) => repo.deleteAuthorizationRequest(request.id)).pipe(
                            Effect.catch(() => Effect.void)
                        );
                        return {
                            redirectTo: authorizationRedirect(request.redirectUri, {
                                error: "access_denied",
                                state: request.state,
                            }),
                        };
                    }

                    yield* OIDCRepository.use((repo) =>
                        repo.upsertConsent({ userId: user.id, clientId: request.clientId, scope: request.scope })
                    ).pipe(Effect.orDie);
                    const redirect = yield* issueAuthorizationCode(request, user.id);
                    if (Option.isNone(redirect)) return yield* new HttpApiError.NotFound();
                    return { redirectTo: redirect.value };
                }, provideRepos)
            );
    })
);

export const ApiLive = HttpApiBuilder.layer(TinyburgApi).pipe(
    Layer.provide(SessionGroupLive),
    Layer.provide(DevelopersGroupLive),
    Layer.provide(ConsentGroupLive)
);
