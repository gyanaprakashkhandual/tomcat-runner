#!/usr/bin/env bash
#
# clean.sh
# Removes compiled output and packaged .vsix files so the next build
# starts from a clean state.

set -euo pipefail

echo "Removing ./out ..."
rm -rf out

echo "Removing packaged .vsix files..."
rm -f ./*.vsix

echo "Clean complete."