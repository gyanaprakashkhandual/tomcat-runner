#!/usr/bin/env bash
#
# setup.sh
# Installs project dependencies and the vsce packaging tool.
# Run this once after cloning the repository.

set -euo pipefail

echo "Installing npm dependencies..."
npm install

echo "Checking for @vscode/vsce..."
if ! command -v vsce >/dev/null 2>&1; then
  echo "vsce not found globally. Installing..."
  npm install -g @vscode/vsce
else
  echo "vsce already installed: $(vsce --version)"
fi

echo "Setup complete."