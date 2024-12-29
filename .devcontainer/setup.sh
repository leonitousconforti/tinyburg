#!/bin/bash -i

set -eo pipefail
echo "🚀 Setting up Tinyburg devcontainer..."

echo "📦 Installing repo dependencies..."
corepack install
corepack enable
pnpm install
pnpm rebuild -r

echo "✅ Checking..."
pnpm codegen
pnpm check
pnpm circular
pnpm lint
pnpm dtslint
pnpm docgen

echo "🏗️ Building..."
pnpm build

echo "🧪 Testing..."
pnpm test

echo "✅ Devcontainer setup complete!"
echo "🙏 Thank you for contributing to Tinyburg!"
echo "📝 P.S Don't forget to configure your git credentials with 'git config --global user.name you' and 'git config --global user.email you@z.com'"
