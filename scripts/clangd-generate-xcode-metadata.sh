#!/bin/bash

echo "PWD: $(pwd)"

MONOREPO_ROOT="../../.."
REANIMATED_COMPILE_COMMANDS_PATH="$MONOREPO_ROOT/packages/react-native-reanimated/compile_commands.json"
WORKLETS_COMPILE_COMMANDS_PATH="$MONOREPO_ROOT/packages/react-native-worklets/compile_commands.json"

compdb_dirs=()

while IFS= read -r line; do
  compdb_dirs+=("$line")
done < <(find . -type d -name "CompilationDatabase")

for dir in "${compdb_dirs[@]}"; do
  for base in "$dir"/*.json; do
    filename=$(basename "$base")
    prefix="${filename%.*.*}.json"
    files=("$dir"/"${prefix%.*}".*.json)

    if [ "${#files[@]}" -gt 1 ]; then
      latest=$(find "${files[@]}" -type f -print0 | xargs -0 ls -t | head -n1)
      for f in "${files[@]}"; do
        [ "$f" != "$latest" ] && rm -f "$f"
      done
    fi
  done
done

echo "[" >"$REANIMATED_COMPILE_COMMANDS_PATH"
for dir in "${compdb_dirs[@]}"; do
  for f in "$dir"/*.json; do
    cat "$f" >>"$REANIMATED_COMPILE_COMMANDS_PATH"
  done
done
echo "]" >>"$REANIMATED_COMPILE_COMMANDS_PATH"

cp "$REANIMATED_COMPILE_COMMANDS_PATH" "$WORKLETS_COMPILE_COMMANDS_PATH"

echo "Generated clangd metadata."
