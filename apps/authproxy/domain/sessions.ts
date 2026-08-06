import type { SqlError } from "effect/unstable/sql";

import { Context, DateTime, Duration, Effect, Layer, type Option, Schedule, Schema } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

/**
 * A signed-in browser. The subject is the Tinyburg user id carried by the
 * id token; the display name and avatar are whatever the `profile` scope
 * shared at sign-in, kept only so the dashboard can greet its visitor.
 *
 * @since 1.0.0
 * @category Models
 */
export class Session extends Model.Class<Session>("Session")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    tokenHash: Model.Sensitive(Schema.String.check(Schema.isBase64Url())),
    sub: Schema.String.check(Schema.isUUID()),
    displayName: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Schema.DateTimeUtcFromDate,
    adminUntil: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }).pipe(
        Model.FieldExcept(["insert"])
    ),
}) {}

/**
 * The repository for sessions.
 *
 * @since 1.0.0
 * @category Services
 */
export class SessionsRepository extends Context.Service<SessionsRepository>()(
    "@tinyburg/authproxy/domain/SessionsRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const sessions = yield* SqlModel.makeRepository(Session, {
                spanPrefix: "@tinyburg/authproxy/domain/SessionsRepository",
                tableName: "sessions",
                idColumn: "id",
            });

            const createSession = (options: {
                readonly sub: string;
                readonly displayName: Option.Option<string>;
                readonly avatarUrl: Option.Option<string>;
                readonly tokenHash: string;
                readonly expiresIn?: Duration.Input | undefined;
            }): Effect.Effect<Session, Schema.SchemaError | SqlError.SqlError, never> =>
                Effect.gen(function* () {
                    const now = yield* DateTime.now;
                    const newSession = yield* Session.insert.makeEffect({
                        sub: options.sub,
                        displayName: options.displayName,
                        avatarUrl: options.avatarUrl,
                        tokenHash: options.tokenHash,
                        expiresAt: now.pipe(DateTime.addDuration(options.expiresIn ?? Duration.days(30))),
                    });

                    return yield* sessions.insert(newSession);
                });

            const findSession = SqlSchema.findOneOption({
                Request: Schema.String,
                Result: Session.select,
                execute: (tokenHash) => sql`
                    SELECT * FROM sessions
                    WHERE token_hash = ${tokenHash} AND expires_at > NOW()
                `,
            });

            const revokeSessionByTokenHash = (tokenHash: string): Effect.Effect<void, SqlError.SqlError, never> =>
                Effect.asVoid(sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`);

            // The elevation window is stated here rather than taken as an
            // argument so a compromised handler cannot ask for more.
            const elevate = SqlSchema.findOneOption({
                Request: Schema.String.check(Schema.isUUID()),
                Result: Session.select,
                execute: (sessionId) => sql`
                    UPDATE sessions SET admin_until = NOW() + INTERVAL '1 hour'
                    WHERE id = ${sessionId} AND expires_at > NOW()
                    RETURNING *
                `,
            });

            yield* sql`DELETE FROM sessions WHERE expires_at < NOW()`.pipe(
                Effect.catchCause((cause) => Effect.logWarning(`failed to purge expired sessions`, cause)),
                Effect.schedule(Schedule.cron("43 * * * *")),
                Effect.forkScoped,
                Effect.asVoid
            );

            return {
                createSession,
                findSession,
                revokeSessionByTokenHash,
                elevate,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, SessionsRepository.make);
}
