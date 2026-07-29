import { DateTime, Duration, Effect, Context, Schema, Layer, SchemaGetter } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlSchema, SqlModel, type SqlError } from "effect/unstable/sql";

import { Session, User } from "./models.ts";

export class SessionsRepository extends Context.Service<SessionsRepository>()(
    "@tinyburg/tinyburg.app/domain/SessionsRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const sessions = yield* SqlModel.makeRepository(Session, {
                spanPrefix: "tinyburg.app.domain.Repository.sessions",
                tableName: "sessions",
                idColumn: "id",
            });

            const deleteSession = sessions.delete;
            const createSession = (
                user: User,
                expiresIn: Duration.Input | undefined = Duration.days(30)
            ): Effect.Effect<Session, Schema.SchemaError | SqlError.SqlError, never> =>
                Effect.gen(function* () {
                    const now = yield* DateTime.now;
                    const newSession = yield* Session.insert.makeEffect({
                        expiresAt: now.pipe(DateTime.addDuration(expiresIn), Model.Override),
                        userId: user.id,
                    });

                    return yield* sessions.insert(newSession);
                });

            const findUserBySession = SqlSchema.findOneOption({
                Request: Schema.String.check(Schema.isUUID()),
                Result: Schema.toEncoded(
                    Schema.Struct({
                        userId: User.fields.id,
                        userCreatedAt: User.fields.createdAt,
                        userLastLoginAt: User.fields.lastLoginAt,
                        userDisplayName: User.fields.displayName,
                        userAvatarUrl: User.fields.avatarUrl,
                        sessionId: Session.fields.id,
                        sessionUserId: Session.fields.userId,
                        sessionCreatedAt: Session.fields.createdAt,
                        sessionExpiresAt: Session.fields.expiresAt,
                    })
                ).pipe(
                    Schema.decodeTo(
                        Schema.Struct({
                            user: User,
                            session: Session,
                        }),
                        {
                            encode: SchemaGetter.forbidden(() => "Encoding not supported"),
                            decode: SchemaGetter.transform((output) => ({
                                user: {
                                    id: output.userId,
                                    createdAt: output.userCreatedAt,
                                    lastLoginAt: output.userLastLoginAt,
                                    displayName: output.userDisplayName,
                                    avatarUrl: output.userAvatarUrl,
                                },
                                session: {
                                    id: output.sessionId,
                                    userId: output.sessionUserId,
                                    createdAt: output.sessionCreatedAt,
                                    expiresAt: output.sessionExpiresAt,
                                },
                            })),
                        }
                    )
                ),
                execute: (sessionId) => sql`
                SELECT
                    users.id as user_id,
                    users.created_at as user_created_at,
                    users.last_login_at as user_last_login_at,
                    users.display_name as user_display_name,
                    users.avatar_url as user_avatar_url,
                    sessions.id as session_id,
                    sessions.user_id as session_user_id,
                    sessions.created_at as session_created_at,
                    sessions.expires_at as session_expires_at
                FROM sessions
                INNER JOIN users ON sessions.user_id = users.id
                WHERE sessions.id = ${sessionId} AND sessions.expires_at > NOW()
            `,
            });

            return {
                deleteSession,
                createSession,
                findUserBySession,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, SessionsRepository.make);
}
