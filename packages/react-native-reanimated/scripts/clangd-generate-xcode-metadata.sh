#!/bin/bash

COMPILE_COMMANDS_PATH="../../../compile_commands.json"

echo "[" >$COMPILE_COMMANDS_PATH
for f in **/CompilationDatabase/*.json; do cat "$f" >>$COMPILE_COMMANDS_PATH; done
echo "]" >>$COMPILE_COMMANDS_PATH

echo "Generated clangd metadata."
