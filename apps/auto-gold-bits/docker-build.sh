#!/usr/bin/env bash
set -euo pipefail

rush build --to @tinyburg/auto-gold-bits
rush deploy --project @tinyburg/auto-gold-bits --create-archive /workspaces/tinyburg/apps/auto-gold-bits/deploy.zip --create-archive-only
docker build -t ghcr.io/leonitousconforti/tinyburg/auto-gold-bits:latest .
