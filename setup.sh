#!/usr/bin/env bash

set -euo pipefail
echo "🚀 Setting up tinyburg devcontainer..."

echo "📦 Installing Rush, Pnpm, and other global dependencies..."
npm install -g pnpm @microsoft/rush vercel ts-node

echo "📦 Installing monorepo dependencies..."
rush install
rush update-autoinstaller --name rush-prettier
rush update-autoinstaller --name rush-commitlint

echo "🏗️ Building all packages..."
rush retest

echo "✅ Devcontainer setup complete!"
echo "🙏 Thank you for contributing to Tinyburg!"
