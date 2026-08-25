import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

/**
 * A Discord account bound to a Tinyburg account. The subject is the Tinyburg
 * user id carried by the id token; the display name and avatar are whatever
 * the `profile` scope shared when the link was made.
 *
 * @since 1.0.0
 * @category Models
 */
export class DiscordLink extends Model.Class<DiscordLink>("DiscordLink")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    discordUserId: Schema.String,
    sub: Schema.String.check(Schema.isUUID()),
    displayName: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * One authorization round trip in flight: everything the callback needs to
 * finish a `/link` that a Discord user started.
 *
 * @since 1.0.0
 * @category Models
 */
export class PendingLink extends Model.Class<PendingLink>("PendingLink")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    stateHash: Model.Sensitive(Schema.String.check(Schema.isBase64Url())),
    codeVerifier: Model.Sensitive(Schema.String),
    discordUserId: Schema.String,
    interactionToken: Model.Sensitive(Schema.String),
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Schema.DateTimeUtcFromDate,
}) {}

/**
 * The repository for Discord account links.
 *
 * @since 1.0.0
 * @category Services
 */
export class LinksRepository extends Context.Service<LinksRepository>()(
    "@tinyburg/discord-bot/domain/LinksRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /**
             * Records a `/link` in flight. The expiry is stated by the schema
             * default rather than passed in, so a handler cannot ask for a
             * longer window than the ten minutes the table allows.
             */
            const beginLink = (options: {
                readonly stateHash: string;
                readonly codeVerifier: string;
                readonly discordUserId: string;
                readonly interactionToken: string;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                Effect.asVoid(sql`
                INSERT INTO discord_pending_links (state_hash, code_verifier, discord_user_id, interaction_token)
                VALUES (
                    ${options.stateHash},
                    ${options.codeVerifier},
                    ${options.discordUserId},
                    ${options.interactionToken}
                )
            `);

            /**
             * Takes a pending link, if one is still live under this state.
             *
             * DELETE ... RETURNING makes the claim single use in one statement:
             * there is no window in which two callbacks both read the row and
             * both proceed, so a replayed callback URL finds nothing.
             */
            const claimPendingLink = SqlSchema.findOneOption({
                Request: Schema.String,
                Result: PendingLink.select,
                execute: (stateHash) => sql`
                DELETE FROM discord_pending_links
                WHERE state_hash = ${stateHash} AND expires_at > NOW()
                RETURNING *
            `,
            });

            const LinkToStore = Schema.Struct({
                discordUserId: Schema.String,
                sub: Schema.String.check(Schema.isUUID()),
                displayName: Schema.NullOr(Schema.String),
                avatarUrl: Schema.NullOr(Schema.String),
            });

            const insertLink = SqlSchema.findOne({
                Request: LinkToStore,
                Result: DiscordLink.select,
                execute: (link) => sql`
                INSERT INTO discord_links (discord_user_id, sub, display_name, avatar_url)
                VALUES (${link.discordUserId}, ${link.sub}, ${link.displayName}, ${link.avatarUrl})
                RETURNING *
            `,
            });

            /**
             * Binds a Discord account to a Tinyburg account, displacing whatever
             * either side was bound to before.
             *
             * Both columns are UNIQUE, so an ON CONFLICT could only ever defend
             * one of them, and the delete has to be its own statement: folding
             * it into the insert as a data-modifying CTE shares one snapshot
             * with the insert, so the unique index still sees the row the CTE
             * is in the middle of removing and rejects the new one. The
             * transaction is what makes the pair atomic instead.
             *
             * Displacing is the right behaviour rather than a conflict error:
             * the caller has just proved control of the Tinyburg account by
             * completing the authorization, which is exactly the proof someone
             * moving to a new Discord account can offer.
             */
            const upsertLink = (link: typeof LinkToStore.Type) =>
                sql.withTransaction(
                    Effect.flatMap(
                        sql`
                            DELETE FROM discord_links
                            WHERE discord_user_id = ${link.discordUserId} OR sub = ${link.sub}
                        `,
                        () => insertLink(link)
                    )
                );

            const findLinkByDiscordUserId = SqlSchema.findOneOption({
                Request: Schema.String,
                Result: DiscordLink.select,
                execute: (discordUserId) => sql`
                SELECT * FROM discord_links WHERE discord_user_id = ${discordUserId}
            `,
            });

            /** Returns the row that was removed, so callers can tell "unlinked" from "was not linked". */
            const deleteLinkByDiscordUserId = SqlSchema.findOneOption({
                Request: Schema.String,
                Result: DiscordLink.select,
                execute: (discordUserId) => sql`
                DELETE FROM discord_links WHERE discord_user_id = ${discordUserId} RETURNING *
            `,
            });

            return {
                beginLink,
                claimPendingLink,
                upsertLink,
                findLinkByDiscordUserId,
                deleteLinkByDiscordUserId,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, LinksRepository.make);
}
