#!/usr/bin/env bash
set -euo pipefail

sudo apt-get install pwgen gpw
cadvisor_USERNAME=$(gpw 1 __REPLACE ME WITH LENGTH OF USERNAME__)
cadvisor_PASSWORD=$(pwgen -s __REPLACE ME WITH LENGTH OF PASSWORD__ 1)

cat > /root/cadvisor-credentials.txt << EOL
cadvisor username: ${cadvisor_USERNAME}
cadvisor password: ${cadvisor_PASSWORD}
EOL

dokku apps:create cadvisor
dokku proxy:ports-set cadvisor http:80:8080
dokku config:set --no-restart cadvisor DOKKU_DOCKERFILE_START_CMD="--docker_only --housekeeping_interval=10s --max_housekeeping_interval=60s"
dokku storage:mount cadvisor /:/rootfs:ro
dokku storage:mount cadvisor /sys:/sys:ro
dokku storage:mount cadvisor /var/lib/docker:/var/lib/docker:ro
dokku storage:mount cadvisor /var/run:/var/run:rw
dokku http-auth:on cadvisor ${cadvisor_USERNAME} ${cadvisor_PASSWORD}
dokku git:from-image cadvisor gcr.io/cadvisor/cadvisor:latest
dokku letsencrypt:enable cadvisor
