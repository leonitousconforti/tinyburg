# @tinyburg/authproxy

This authproxy service will authenticate your requests before forwarding them to
Nimblebit's servers.

## Public API keys

Two keys are provided to the public for testing:

1. `00000000-0000-0000-0000-000000000001` is a none account and will permit no
   scopes
2. `00000000-0000-0000-0000-000000000002` is a readonly account and will permit
   access to all readonly scopes

## Signing in

The dashboard signs in through tinyburg.app over OpenID Connect, using
`@yielded/oauth`. At boot the proxy registers itself there as a public client
(RFC 7591, keyed on its software id, so registering again is the same client)
and discovers the provider's endpoints from `TINYBURG_OAUTH_ISSUER`. Elevation
to admin re-authorizes with the scope that lists linked Tiny Tower accounts and
checks them against `ADMIN_PLAYER_IDS`.

API keys are the proxy's own: each game endpoint carries the
`OAuthScope.Required` annotation from its sdk, and a key may call it when its
scopes satisfy that requirement.
