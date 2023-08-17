#!/usr/bin/env bash
set -euo pipefail

/usr/local/bin/envoy-1.27.0-linux-x86_64 -c /etc/envoy/envoy.yaml &
