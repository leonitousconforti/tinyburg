#!/usr/bin/env bash
set -euo pipefail

sudo apt-get install pwgen gpw
pgweb_USERNAME=$(gpw 1 __REPLACE ME WITH LENGTH OF USERNAME__)
pgweb_PASSWORD=$(pwgen -s __REPLACE ME WITH LENGTH OF PASSWORD__ 1)

cat > /root/pgweb-credentials.txt << EOL
pgweb username: ${pgweb_USERNAME}
pgweb password: ${pgweb_PASSWORD}
EOL

dokku apps:create pgweb
dokku proxy:ports-set pgweb http:80:8081
dokku http-auth:on pgweb ${pgweb_USERNAME} ${pgweb_PASSWORD}
dokku postgres:link authproxy_api_keys pgweb
dokku git:from-image pgweb sosedoff/pgweb:latest
dokku letsencrypt:enable pgweb
