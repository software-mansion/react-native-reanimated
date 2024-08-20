#!/bin/bash

HARD_LOCATION="../../../packages/react-native-reanimated/apple/.cache/compile_commands.json"

echo "[" >$HARD_LOCATION

for f in **/CompilationDatabase/*.json; do cat "$f" >>$HARD_LOCATION; done
echo "]" >>$HARD_LOCATION
