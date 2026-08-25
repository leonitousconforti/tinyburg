/**
 * Browser sessions for the dashboard.
 *
 * A session is what a completed "sign in with Tinyburg" round trip leaves
 * behind. It holds the provider's access token so the dashboard can ask, on the
 * visitor's behalf, which TinyTower accounts they have linked. That token is
 * short-lived by design and separate from the long-lived grant the crawl uses.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, DateTime, Duration, Effect, Layer, type Option, Schema } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

/**
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
    /**
     * Never leaves the server. `FieldOnly` keeps it out of the json the
     * dashboard receives, which has no business holding a provider token, and
     * out of inserts, since it is only known after the token exchange.
     */
    accessTokenCiphertext: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }).pipe(
        Model.FieldOnly(["select", "update"])
    ),
    accessTokenExpiresAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }).pipe(
        Model.FieldOnly(["select", "update"])
    ),
}) {}

/**
 * @since 1.0.0
 * @category Services
 */
export class SessionsRepository extends Context.Service<SessionsRepository>()(
    "@tinyburg/social-circles/domain/SessionsRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const sessions = yield* SqlModel.makeRepository(Session, {
                spanPrefix: "@tinyburg/social-circles/domain/SessionsRepository",
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
                    const newSession = yield* Session.insert
                        .makeEffect({
                            sub: options.sub,
                            displayName: options.displayName,
                            avatarUrl: options.avatarUrl,
                            tokenHash: options.tokenHash,
                            expiresAt: now.pipe(DateTime.addDuration(options.expiresIn ?? Duration.days(30))),
                        })
                        .pipe(Effect.mapError((issue) => new Schema.SchemaError(issue)));

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

            /** Stashes the provider's access token against a session. */
            const setAccessToken = (options: {
                readonly sessionId: string;
                readonly ciphertext: string;
                readonly expiresAt: Date;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    UPDATE sessions
                    SET access_token_ciphertext = ${options.ciphertext},
                        access_token_expires_at = ${options.expiresAt}
                    WHERE id = ${options.sessionId}
                `.pipe(Effect.asVoid);

            const revokeSessionByTokenHash = (tokenHash: string): Effect.Effect<void, SqlError.SqlError, never> =>
                Effect.asVoid(sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`);

            return {
                createSession,
                findSession,
                setAccessToken,
                revokeSessionByTokenHash,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(SessionsRepository, SessionsRepository.make);
}
