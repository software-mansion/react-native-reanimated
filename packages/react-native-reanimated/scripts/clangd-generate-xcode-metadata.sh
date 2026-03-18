#!/bin/bash

COMPILE_COMMANDS_REANIMATED_PATH="../../../packages/react-native-reanimated/compile_commands.json"
COMPILE_COMMANDS_WORKLETS_PATH="../../../packages/react-native-worklets/compile_commands.json"
COMPILATION_DATABASE_PATH="**/CompilationDatabase"


out="$COMPILE_COMMANDS_REANIMATED_PATH"

printf "[\n" > "$out"
cat $COMPILATION_DATABASE_PATH/*.json >> "$out"

sed '$ s/,$//' "$out" > "$out.tmp"
mv "$out.tmp" "$out"

printf "]" >> "$out"

cp "$COMPILE_COMMANDS_REANIMATED_PATH" "$COMPILE_COMMANDS_WORKLETS_PATH"


echo "Generated clangd metadata."