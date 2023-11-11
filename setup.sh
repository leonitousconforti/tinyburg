#!/usr/bin/env bash

set -euo pipefail
echo "🚀 Setting up tinyburg devcontainer..."

echo "⏬ Download nodejs lts/hydrogen..."
source "${NVM_DIR}/nvm.sh"
nvm install
nvm use

echo "📦 Installing Rush, Pnpm, and other global dependencies..."
npm install -g pnpm @microsoft/rush vercel ts-node

echo "📦 Installing monorepo dependencies..."
rush install --purge
rush update-autoinstaller --name rush-prettier
rush update-autoinstaller --name rush-commitlint
rush update-autoinstaller --name rush-github-action-cache

echo "🩹 Running some python setup scripts"
pip3 install -r packages/explorer/requirements.txt
pip3 install -r packages/architect/requirements.txt
pip3 install -r packages/doorman/assets/requirements.txt

echo "🏗️ Building all packages..."
rush build

echo "❓ You need to configure your .env file before we can run tests"
cp -n .env.example .env
nano .env

echo "🧪 Testing all packages..."
rush test

echo "✅ Devcontainer setup complete!"
echo "🙏 Thank you for contributing to Tinyburg!"
echo "📝 You can find docs at https://github.com/leonitousconforti/tinyburg/tree/main/docs"
echo "📕 P.S Don't forget to configure your git credentials with 'git config --global user.name you' and 'git config --global user.email you@z.com'"
