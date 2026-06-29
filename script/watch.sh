#!/usr/bin/env bash
#
# watch.sh
# Runs the TypeScript compiler in watch mode for active development.
# Press F5 in VS Code afterward to launch the Extension Development Host.

set -euo pipefail

echo "Starting TypeScript watch mode (tsc -watch -p ./)..."
npx tsc -watch -p ./