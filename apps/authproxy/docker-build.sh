#!/usr/bin/env bash
set -e

rush build --to @tinyburg/authproxy
rush deploy --project @tinyburg/authproxy --create-archive /workspaces/tinyburg/apps/authproxy/deploy.zip --create-archive-only
docker build -t ghcr.io/leonitousconforti/tinyburg/authproxy:latest .
