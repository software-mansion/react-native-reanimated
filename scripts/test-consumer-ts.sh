#!/bin/bash

# Type-checks a consumer fixture against the package's published declarations
# (`package.json#types`, i.e. the built `lib/typescript`). Run it from the
# package directory with the fixture directory as the argument, after `yarn
# build`. The fixture's tsconfig sets `skipLibCheck: false`; errors in other
# packages' declarations (e.g. react-native-svg against the installed
# react-native types) aren't ours to fix, so only errors outside
# `node_modules` are reported: the fixture itself and the declarations of this
# package and its workspace dependencies.

FIXTURE_DIR="${1:?usage: test-consumer-ts.sh <fixture-dir>}"

if [ ! -f lib/typescript/index.d.ts ]; then
  echo "lib/typescript/index.d.ts not found, run \`yarn build\` first" >&2
  exit 1
fi

OUTPUT=$(yarn tsc --noEmit --pretty false --project "$FIXTURE_DIR")
STATUS=$?

ERRORS=$(echo "$OUTPUT" |
  awk '/^[^ ]/ { keep = ($0 !~ /^(\.\.\/)*node_modules\//) } keep')

if [ -n "$ERRORS" ]; then
  echo "$ERRORS"
  exit 1
fi

# A nonzero exit with no diagnostics means tsc itself failed (yarn error, crash).
if [ "$STATUS" -ne 0 ] && ! echo "$OUTPUT" | grep -q 'error TS'; then
  echo "$OUTPUT"
  echo "tsc exited with status $STATUS without reporting diagnostics" >&2
  exit "$STATUS"
fi
