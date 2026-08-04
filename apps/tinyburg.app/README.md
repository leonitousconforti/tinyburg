# tinyburg.app

A [foldkit](https://foldkit.dev) single-page app served by an Effect http server.

- `client/` is the foldkit SPA: one Model, one update function, routes parsed with `Route` combinators, and side effects as Commands. Data comes from the server through an `HttpApiClient` derived from the shared api spec.
- `server/` is the Effect http server: OAuth login/callback routes for Google and Discord (the app's own sign-in), the "Sign in with Tinyburg" OIDC provider built on [effect-oidc](https://github.com/leonitousconforti/effect-oidc), session cookies backed by Postgres, the `TinyburgApi` HttpApi implementation, and static serving of the built client with an SPA fallback.
- `domain/` and `migrations/` are the repositories, models, and Postgres migrations.
