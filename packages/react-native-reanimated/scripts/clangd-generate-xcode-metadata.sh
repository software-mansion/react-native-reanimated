#!/bin/bash

COMPILE_COMMANDS_REANIMATED_PATH="../../../packages/react-native-reanimated/compile_commands.json"
COMPILE_COMMANDS_WORKLETS_PATH="../../../packages/react-native-worklets/compile_commands.json"

process_folder() {
    local folder=$1
    local output=$2

    printf "[\n" > "$output"

    cat $folder/*.json >> "$output"

    sed '$ s/,$//' "$output" > "$output.tmp" && mv "$output.tmp" "$output"

    printf "]" >> "$output"
}

process_folder "**/CompilationDatabaseReanimated" "$COMPILE_COMMANDS_REANIMATED_PATH"
process_folder "**/CompilationDatabaseWorklets" "$COMPILE_COMMANDS_WORKLETS_PATH"

echo "Generated clangd metadata."