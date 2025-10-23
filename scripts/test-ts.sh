#!/bin/bash

ARGS=("$@")
FILES=()

for path in "${ARGS[@]}"; do
  if [ -d "$path" ]; then
    for file in "$path"/*.ts "$path"/*.tsx "$path"/*.d.ts; do
      if [ -f "$file" ]; then
        FILES+=("$file")
      fi
    done
  else
    FILES+=("$path")
  fi
done


check_types() {
  local suffixes="$1"
  yarn tsc --noEmit --target es6 --module ESNext --jsx react-native --skipLibCheck true --allowSyntheticDefaultImports true --moduleResolution node --esModuleInterop true --strict true --forceConsistentCasingInFileNames true --moduleSuffixes "$suffixes" --resolveJsonModule "${FILES[@]}"
}

check_types ".native,.ios,.android,"

check_types ".web,"
