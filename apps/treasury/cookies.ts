import { Config, Context, Effect, Layer } from "effect";

/**
 * The treasury's cookie policy, resolved once at boot.
 *
 * The treasury keeps no session of its own - its api is bearer authenticated
 * and the connect flow's state, verifier and return-to cookies are the only
 * cookies it ever sets. They still deserve the same treatment as anyone
 * else's: Secure with the `__Host-` prefix outside development, so a hostile
 * subdomain can never plant a copy of the OAuth round-trip cookies.
 */
export class CookiePolicy extends Context.Service<CookiePolicy>()("@tinyburg/treasury/CookiePolicy", {
    make: Effect.map(Config.string("NODE_ENV").pipe(Config.withDefault("production")), (env) => {
        const secure = env !== "development";
        const name = (base: string): string => (secure ? `__Host-${base}` : base);
        return { secure, name } as const;
    }),
}) {
    static readonly Default = Layer.effect(CookiePolicy, CookiePolicy.make);
}
