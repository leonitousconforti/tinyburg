import { Context } from "effect";

import type { Session, User } from "../domain/models.ts";

/**
 * The browser session. The cookie carries a secret; the database keeps only its
 * hash, so nothing stored can reopen a session and the session list can name
 * rows by their id without handing out the credential that opens them.
 *
 * It authenticates the human at `/oauth/authorize` and the consent screen, and
 * it authenticates the first-party app: the session middleware trades it for a
 * short-lived access token so the bearer-only api stays bearer-only. Relying
 * applications still authenticate with access tokens of their own.
 */
export const PROVIDER_SESSION_COOKIE = "tinyburg_session";

export class CurrentSession extends Context.Service<CurrentSession, Session>()(
    "@tinyburg/tinyburg.app/server/providerSession/CurrentSession"
) {}

export class CurrentUser extends Context.Service<CurrentUser, { user: User; session: Session }>()(
    "@tinyburg/tinyburg.app/server/providerSession/CurrentUser"
) {}
