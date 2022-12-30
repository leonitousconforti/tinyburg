# Proxy server used to set authentication headers

[![authproxy build](https://github.com/leonitousconforti/tinyburg/actions/workflows/build.yml/badge.svg?branch=authproxy)](https://github.com/leonitousconforti/tinyburg/actions/workflows/build.yml)

You can use this proxy server to set the proper authentication headers for you. **IMPORTANT: this server will not function properly if you run it on your own, you need the .env file.**

## Notes:

1. The proxy is rate-limited, you will only be able to send 5 requests every 2 mins by default
2. You must set the "useProxy" flag in the tinyburg library if you wish to enable the auth proxy
3. This proxy will deny requests for certain scopes. It will not process any enter raffle, new user, or upload save requests

<br>

Higher rate limits and privileged scopes can be granted to users through API keys. There is no dashboard for managing api keys as of right now. To obtain an api key, email <support@tinyburg.app>. The header of the email should be "Tinyburg Authproxy API Key Request" and explain in the body why you are requesting an api key and how you plan to use it. API keys can be revoked at any time and for any reason.
