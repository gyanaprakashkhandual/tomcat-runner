#!/usr/bin/env bash
#
# build.sh
# Compiles the extension's TypeScript source into out/ using tsconfig.json.

set -euo pipefail

echo "Compiling TypeScript (tsc -p ./)..."
npx tsc -p ./

echo "Build complete. Output written to ./out"