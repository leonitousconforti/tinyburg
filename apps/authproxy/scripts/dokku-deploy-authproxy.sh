#!/usr/bin/env bash
set -euo pipefail

sudo dokku plugin:install https://github.com/dokku/dokku-redis.git
sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git
sudo dokku plugin:install https://github.com/dokku/dokku-http-auth.git
sudo dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git

dokku apps:create authproxy
dokku redis:create authproxy_rate_limit
dokku postgres:create authproxy_api_keys

dokku proxy:ports-set authproxy http:80:5000
dokku config:set authproxy SECRET_SALT=''
dokku letsencrypt:set --global email ''

dokku redis:link authproxy_rate_limit authproxy
dokku postgres:link authproxy_api_keys authproxy

dokku git:from-image authproxy ghcr.io/leonitousconforti/tinyburg/authproxy:latest
dokku letsencrypt:enable authproxy
