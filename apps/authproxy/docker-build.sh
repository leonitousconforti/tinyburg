#!/usr/bin/env bash
set -e

rush build --to @tinyburg/authproxy
rush deploy --project @tinyburg/authproxy --create-archive /workspaces/tinyburg/apps/authproxy/deploy.zip --create-archive-only
docker build --build-arg GIT_SHA=$(git rev-parse --short HEAD) -t ghcr.io/leonitousconforti/tinyburg/authproxy:latest .
