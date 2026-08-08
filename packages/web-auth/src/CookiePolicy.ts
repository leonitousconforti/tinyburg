/**
 * The one cookie policy every tinyburg web app applies to every cookie it
 * sets.
 *
 * @since 1.0.0
 */

import { Config, Context, Effect, Layer } from "effect";

/**
 * The site's cookie policy, resolved once at boot so request handlers never
 * carry a config failure channel. Each app keeps its own cookie names; this
 * service decides how any name is finalized and whether cookies demand
 * https.
 *
 * Cookies demand https unless the environment explicitly says development, so
 * a production deploy that forgets to set NODE_ENV still ships Secure
 * cookies. Secure cookies also carry the __Host- prefix, which browsers only
 * accept over https, from the exact host, with no Domain attribute: a hostile
 * subdomain can then never plant a copy of the session or OAuth round-trip
 * cookies. Plain names in development, where http would refuse the prefix.
 *
 * @since 1.0.0
 */
export class CookiePolicy extends Context.Service<CookiePolicy>()("@tinyburg/web-auth/CookiePolicy", {
    make: Effect.map(Config.string("NODE_ENV").pipe(Config.withDefault("production")), (env) => {
        const secure = env !== "development";
        const name = (base: string): string => (secure ? `__Host-${base}` : base);
        return { secure, name } as const;
    }),
}) {
    static readonly Default = Layer.effect(this, CookiePolicy.make);
}
