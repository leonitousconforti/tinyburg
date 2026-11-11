#!/usr/bin/env bash
# Deploys a commit of main to the staging stack, on the staging box itself.
#
# It is the forced command of the deploy key in ~/.ssh/authorized_keys, so the
# key can do nothing but this:
#
#   restrict,command="$HOME/tinyburg-staging/scripts/deploy-staging.sh" ssh-ed25519 AAAA... staging-deploy
#
# The client's command line (SSH_ORIGINAL_COMMAND) is the full sha of the
# commit to deploy, and only a commit on origin/main is accepted. A commit
# older than the one already deployed is skipped, so deploys that finish out of
# order never go backwards.
#
# Everything is inside main so bash has read the whole script before the
# merge below rewrites this file.

set -euo pipefail

main() {
    local sha="${SSH_ORIGINAL_COMMAND:-${1:-}}"
    if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
        echo "usage: deploy-staging.sh <full sha of a commit on main>" >&2
        exit 64
    fi

    local nix=/nix/var/nix/profiles/default/bin/nix
    cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.."

    git fetch --quiet origin main
    if ! git merge-base --is-ancestor "$sha" origin/main; then
        echo "refusing $sha: not on origin/main" >&2
        exit 1
    fi
    if git merge-base --is-ancestor "$sha" HEAD; then
        echo "$sha is already deployed (at $(git rev-parse --short HEAD))"
        exit 0
    fi

    echo "deploying $sha over $(git rev-parse --short HEAD)"
    systemctl --user stop tinyburg-staging
    git merge --ff-only --quiet "$sha"
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 "$nix" develop --command pnpm install --frozen-lockfile
    systemctl --user start tinyburg-staging

    # Up means every public app answers http, whatever the status (the
    # treasury has no page at /).
    local port
    for port in 3000 3001 3002 3004; do
        if ! curl --silent --output /dev/null --retry 30 --retry-delay 4 --retry-all-errors --max-time 5 \
            "http://127.0.0.1:$port/"; then
            echo "port $port did not come up; see journalctl --user -u tinyburg-staging" >&2
            exit 1
        fi
    done
    echo "deployed $sha"
}

main "$@"
