#!/usr/bin/env bash

echo "🚀 Setting up tinyburg devcontainer..."

# Install rush and pnpm package manager
echo "📦 Installing Rush and Pnpm dependencies..."
npm install -g pnpm @microsoft/rush

# Install tinyburg dependencies
echo "📦 Installing monorepo dependencies..."
rush install
rush update-autoinstaller --name rush-prettier

echo "🚀 Devcontainer setup complete!"
echo "🙏 Thank you for contributing to Tinyburg!"
