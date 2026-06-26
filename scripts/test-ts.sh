#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ARGS=("$@")
FILES=()
TSTYCHE_FILES=()

for path in "${ARGS[@]}"; do
  if [ -d "$path" ]; then
    for file in "$path"/*.ts "$path"/*.tsx "$path"/*.d.ts; do
      if [ -f "$file" ]; then
        case "$file" in
          *.tst.ts | *.tst.tsx) TSTYCHE_FILES+=("$file") ;;
          *) FILES+=("$file") ;;
        esac
      fi
    done
  else
    FILES+=("$path")
  fi
done

STATUS=0

check_types() {
  local suffixes="$1"
  yarn tsc --noEmit --target es6 --module ESNext --jsx react-native --skipLibCheck true --allowSyntheticDefaultImports true --moduleResolution node --esModuleInterop true --strict true --forceConsistentCasingInFileNames true --moduleSuffixes "$suffixes" --resolveJsonModule "${FILES[@]}" || STATUS=1
}

if [ ${#FILES[@]} -gt 0 ]; then
  check_types ".native,.ios,.android,"
  check_types ".web,"
fi

# TSTyche resolves paths and its config file relative to the working
# directory, so invoke the binary directly with package-relative paths.
# The default run checks against the native type surface (the nearest
# tsconfig.json); a second run with tsconfig.web.json mirrors the web
# moduleSuffixes pass above.
if [ ${#TSTYCHE_FILES[@]} -gt 0 ]; then
  "$ROOT_DIR/node_modules/.bin/tstyche" "${TSTYCHE_FILES[@]}" || STATUS=1
  for path in "${ARGS[@]}"; do
    if [ -f "$path/tsconfig.web.json" ]; then
      "$ROOT_DIR/node_modules/.bin/tstyche" --tsconfig "./$path/tsconfig.web.json" "${TSTYCHE_FILES[@]}" || STATUS=1
      break
    fi
  done
fi

exit $STATUS
