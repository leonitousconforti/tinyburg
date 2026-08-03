import { Effect, Layer, Option } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { DevelopersRepository } from "../../domain/developers.ts";
import { SessionsRepository } from "../../domain/sessions.ts";
import { TinyburgApi } from "../../shared/api.ts";
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

export const ApiLive = HttpApiBuilder.layer(TinyburgApi).pipe(
    Layer.provide(SessionGroupLive),
    Layer.provide(DevelopersGroupLive)
);
