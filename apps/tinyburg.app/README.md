# tinyburg.app

A [foldkit](https://foldkit.dev) single-page app served by an Effect http server.

- `client/` is the foldkit SPA: one Model, one update function, routes parsed with `Route` combinators, and side effects as Commands. Data comes from the server through an `HttpApiClient` derived from the shared api spec.
- `server/` is the Effect http server: OAuth login/callback routes for Google and Discord (the app's own sign-in), the "Sign in with Tinyburg" OIDC provider built on [effect-oidc](https://github.com/leonitousconforti/effect-oidc), session cookies backed by Postgres, the `TinyburgApi` HttpApi implementation, and static serving of the built client with an SPA fallback.
- `shared/` holds what both sides import: the `HttpApi` spec with its wire schemas, and the post-login `returnTo` helpers.
- `domain/` and `migrations/` are the repositories, models, and Postgres migrations.

## OIDC provider

`server/routes/oidc.ts` mounts the "Sign in with Tinyburg" provider: discovery, JWKS, `/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`, and RFC 7009 `/oauth/revoke`. It supports public clients (SPAs, native apps) with PKCE and no secret alongside confidential clients, and the consent screen is a client route (`/oauth/consent`) driven by the `ConsentGroup` api. The provider only mounts when `OIDC_PRIVATE_JWK` is set; without it those routes are absent and the rest of the app is unaffected. Generate a key with `Jwt.generateSigningKey()` from effect-oidc and keep the private JWK secret.

## Developing

```sh
pnpm start  # the http server on :3000 (needs DATABASE_URL, runs migrations on boot)
pnpm dev    # vite dev server on :5173, proxying /api, /auth, and /logout to :3000
```

## Building

`pnpm build` writes the client to `dist/client`, which `pnpm start` serves in production. The server itself runs straight from source with node.

## Configuration

Read from the environment or a local `.env`: `DATABASE_URL`, `PORT`, `HOST`, `NODE_ENV` (secure cookies when `production`), `SITE_URL` (the OIDC issuer, defaults to `https://tinyburg.app`), `OIDC_PRIVATE_JWK` (the provider's ES256 signing key as JSON; omit to disable the provider), and per-provider `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` and `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET`/`DISCORD_REDIRECT_URI`.
