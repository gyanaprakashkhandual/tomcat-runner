#!/usr/bin/env bash
#
# package.sh
# Produces a distributable .vsix package: clean -> compile -> vsce package.
# Mirrors what vscode:prepublish does, then runs vsce on top.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Cleaning previous build output..."
"$SCRIPT_DIR/clean.sh"

echo "Compiling..."
"$SCRIPT_DIR/build.sh"

if ! command -v vsce >/dev/null 2>&1; then
  echo "vsce not found. Run setup.sh first, or install it with:"
  echo "  npm install -g @vscode/vsce"
  exit 1
fi

echo "Packaging .vsix..."
vsce package

echo "Package complete. Find the .vsix in the project root."