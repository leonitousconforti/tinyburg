# @tinyburg/authproxy

This authproxy service will authenticate your requests before forwarding them to Nimblebit's servers.

## Public API keys

Two keys are provided to the public for testing:

1. `00000000-0000-0000-0000-000000000001` is a none account and will permit no scopes
2. `00000000-0000-0000-0000-000000000002` is a readonly account and will permit access to all readonly scopes

If you would like access to other scopes, don't hesitate to reach out for a personal api key.

## Rate Limiting

Default rate limit is 3 requests within 1 minute. The public API keys above are rate limited by ip address, all other authenticated requests are rate limited by api key. If you find that you need an increased rate limit, don't hesitate to reach out for a personal API key.

## Self Service

There is currently no "self service" app for managing your personal api keys yet, an integration will likely be built into <https://tinyburg.app>
