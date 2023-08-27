#!/usr/bin/env bash

set -euo pipefail
echo "🚀 Setting up tinyburg devcontainer..."

echo "📦 Installing Rush, Pnpm, and other global dependencies..."
npm install -g pnpm @microsoft/rush vercel ts-node

echo "📦 Installing monorepo dependencies..."
rush install
rush update-autoinstaller --name rush-prettier
rush update-autoinstaller --name rush-commitlint

echo "🩹 Running some bash setup scripts"
(cd packages/apks/vendor && ./setup.sh)

echo "🏗️ Building all packages..."
rush rebuild

# echo "❓ Where should I run @tinyburg/architect tests? [default: /var/run/docker.sock]"
# export ARCHITECT_DOCKER_HOST="ssh://ci@ci.tinyburg.app:22"

# echo "🧪 Testing all packages..."
# rush retest

echo "✅ Devcontainer setup complete!"
echo "🙏 Thank you for contributing to Tinyburg!"
echo "📝 You can find docs at ..."
