import type { SqlError, Statement } from "effect/unstable/sql";

import { Context, DateTime, Duration, Effect, Layer, Option, Schema, SchemaGetter } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

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

            const createSession = (options: {
                readonly user: User;
                readonly tokenHash: string;
                readonly userAgent: Option.Option<string>;
                readonly ip: Option.Option<string>;
                readonly expiresIn?: Duration.Input | undefined;
            }): Effect.Effect<Session, Schema.SchemaError | SqlError.SqlError, never> =>
                Effect.gen(function* () {
                    const now = yield* DateTime.now;
                    const newSession = yield* Session.insert.makeEffect({
                        userId: options.user.id,
                        tokenHash: options.tokenHash,
                        userAgent: options.userAgent,
                        ip: options.ip,
                        expiresAt: now.pipe(
                            DateTime.addDuration(options.expiresIn ?? Duration.days(30)),
                            Model.Override
                        ),
                    });

                    return yield* sessions.insert(newSession);
                });

            const findSessionWithUser = SqlSchema.findOneOption({
                Request: Schema.String,
                Result: Schema.toEncoded(
                    Schema.Struct({
                        userId: User.fields.id,
                        userCreatedAt: User.fields.createdAt,
                        userLastLoginAt: User.fields.lastLoginAt,
                        userDisplayName: User.fields.displayName,
                        userAvatarUrl: User.fields.avatarUrl,
                        sessionId: Session.fields.id,
                        sessionUserId: Session.fields.userId,
                        sessionTokenHash: Session.fields.tokenHash,
                        sessionCreatedAt: Session.fields.createdAt,
                        sessionExpiresAt: Session.fields.expiresAt,
                        sessionLastSeenAt: Session.fields.lastSeenAt,
                        sessionUserAgent: Session.fields.userAgent,
                        sessionIp: Session.fields.ip,
                        sessionAccessToken: Session.fields.accessToken,
                        sessionAccessTokenExpiresAt: Session.fields.accessTokenExpiresAt,
                        sessionAccessTokenJti: Session.fields.accessTokenJti,
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
                                    tokenHash: output.sessionTokenHash,
                                    createdAt: output.sessionCreatedAt,
                                    expiresAt: output.sessionExpiresAt,
                                    lastSeenAt: output.sessionLastSeenAt,
                                    userAgent: output.sessionUserAgent,
                                    ip: output.sessionIp,
                                    accessToken: output.sessionAccessToken,
                                    accessTokenExpiresAt: output.sessionAccessTokenExpiresAt,
                                    accessTokenJti: output.sessionAccessTokenJti,
                                },
                            })),
                        }
                    )
                ),
                execute: (tokenHash) => sql`
                    WITH found AS (
                        SELECT
                            users.id as user_id,
                            users.created_at as user_created_at,
                            users.last_login_at as user_last_login_at,
                            users.display_name as user_display_name,
                            users.avatar_url as user_avatar_url,
                            sessions.id as session_id,
                            sessions.user_id as session_user_id,
                            sessions.token_hash as session_token_hash,
                            sessions.created_at as session_created_at,
                            sessions.expires_at as session_expires_at,
                            sessions.last_seen_at as session_last_seen_at,
                            sessions.user_agent as session_user_agent,
                            sessions.ip as session_ip,
                            sessions.access_token as session_access_token,
                            sessions.access_token_expires_at as session_access_token_expires_at,
                            sessions.access_token_jti as session_access_token_jti
                        FROM sessions
                        INNER JOIN users ON sessions.user_id = users.id
                        WHERE sessions.token_hash = ${tokenHash} AND sessions.expires_at > NOW()
                    ),
                    touched AS (
                        UPDATE sessions SET last_seen_at = NOW()
                        WHERE id = (SELECT session_id FROM found)
                          AND last_seen_at < NOW() - INTERVAL '5 minutes'
                    )
                    SELECT * FROM found
                `,
            });

            const listForUser = SqlSchema.findAll({
                Request: Schema.String.check(Schema.isUUID()),
                Result: Session,
                execute: (userId) => sql`
                    SELECT * FROM sessions
                    WHERE user_id = ${userId} AND expires_at > NOW()
                    ORDER BY last_seen_at DESC
                `,
            });

            const revokeWhere = (where: Statement.Fragment) => sql`
                WITH deleted AS (
                    DELETE FROM sessions WHERE ${where}
                    RETURNING id, access_token_jti, access_token_expires_at
                ),
                revoked AS (
                    INSERT INTO revoked_tokens (jti, expires_at)
                    SELECT access_token_jti, access_token_expires_at FROM deleted
                    WHERE access_token_jti IS NOT NULL AND access_token_expires_at > NOW()
                    ON CONFLICT (jti) DO NOTHING
                )
                SELECT id FROM deleted
            `;

            const revokeSession = (options: {
                readonly userId: string;
                readonly sessionId: string;
            }): Effect.Effect<boolean, SqlError.SqlError, never> =>
                Effect.map(
                    revokeWhere(sql`id = ${options.sessionId} AND user_id = ${options.userId}`),
                    (rows) => rows.length > 0
                );

            const revokeSessionByTokenHash = (tokenHash: string): Effect.Effect<void, SqlError.SqlError, never> =>
                Effect.asVoid(revokeWhere(sql`token_hash = ${tokenHash}`));

            const revokeSessionsForUser = (options: {
                readonly userId: string;
                readonly exceptSessionId: Option.Option<string>;
            }): Effect.Effect<number, SqlError.SqlError, never> =>
                Effect.map(
                    revokeWhere(
                        Option.match(options.exceptSessionId, {
                            onNone: () => sql`user_id = ${options.userId}`,
                            onSome: (keep) => sql`user_id = ${options.userId} AND id <> ${keep}`,
                        })
                    ),
                    (rows) => rows.length
                );

            const storeAccessToken = (options: {
                readonly sessionId: string;
                readonly accessToken: string;
                readonly accessTokenJti: Option.Option<string>;
                readonly expiresAt: Date;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    UPDATE sessions
                    SET access_token = ${options.accessToken},
                        access_token_expires_at = ${options.expiresAt},
                        access_token_jti = ${Option.getOrNull(options.accessTokenJti)}
                    WHERE id = ${options.sessionId}
                `.pipe(Effect.asVoid);

            return {
                createSession,
                findSessionWithUser,
                listForUser,
                revokeSession,
                revokeSessionByTokenHash,
                revokeSessionsForUser,
                storeAccessToken,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, SessionsRepository.make);
}
