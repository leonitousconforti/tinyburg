#!/usr/bin/env bash

set -e
echo "🚀 Setting up tinyburg devcontainer..."

echo "📦 Installing Rush and Pnpm dependencies..."
npm install -g pnpm @microsoft/rush

echo "📦 Installing monorepo dependencies..."
rush install
rush update-autoinstaller --name rush-prettier

echo "🏗️ Building all packages..."
rush build

echo "✅ Devcontainer setup complete!"
echo "🙏 Thank you for contributing to Tinyburg!"