#!/bin/bash

# Fetches unpatched TypeScript from npm.
# Yarn patches TypeScript with PnP code that uses Node-only APIs,
# breaking browser usage (e.g. docs playgrounds).

# Exit immediately on errors, unset variables, or failed pipes.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS_VERSION=$(node -e "process.stdout.write(require('typescript/package.json').version)")
OUT_DIR="$REPO_ROOT/.yarn/unprocessed/typescript"

EXISTING_VERSION=$(node -e "try{process.stdout.write(require('$OUT_DIR/package.json').version)}catch{}" 2>/dev/null || true)
if [ "$EXISTING_VERSION" = "$TS_VERSION" ]; then
  echo "Unpatched TypeScript $TS_VERSION already present, skipping."
  exit 0
fi

echo "Fetching unpatched TypeScript $TS_VERSION from npm..."
TMPDIR=$(mktemp -d)
# Clean up the temp directory when the script exits (success, failure, or interruption).
trap 'rm -rf $TMPDIR' EXIT

mkdir -p "$OUT_DIR"
npm pack "typescript@$TS_VERSION" --pack-destination "$TMPDIR" --silent
tar -xzf "$TMPDIR/typescript-$TS_VERSION.tgz" -C "$OUT_DIR" --strip-components=1
echo "Unpatched TypeScript $TS_VERSION saved to $OUT_DIR."
