#!/usr/bin/env bash
set -euo pipefail

sudo apt-get install pwgen gpw
redisinsights_USERNAME=$(gpw 1 __REPLACE ME WITH LENGTH OF USERNAME__)
redisinsights_PASSWORD=$(pwgen -s __REPLACE ME WITH LENGTH OF PASSWORD__ 1)

cat > /root/redisinsights-credentials.txt << EOL
redisinsights username: ${redisinsights_USERNAME}
redisinsights password: ${redisinsights_PASSWORD}
EOL

dokku apps:create redisinsight
dokku proxy:ports-set redisinsight http:80:8001
dokku http-auth:on redisinsight ${redisinsights_USERNAME} ${redisinsights_PASSWORD}
dokku redis:link authproxy_rate_limit redisinsight
dokku git:from-image redisinsight redislabs/redisinsight:latest
dokku letsencrypt:enable redisinsight
