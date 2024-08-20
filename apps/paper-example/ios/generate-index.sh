#!/bin/bash

HARD_LOCATION="../../../packages/react-native-reanimated/apple/.cache/compile_commands.json"

echo "[" >$HARD_LOCATION

for f in **/CompilationDatabase/*.json; do cat $f >>$HARD_LOCATION; done
# for f in Pods/CompilationDatabase/*.json; do awk '{print substr($0, 0, length($0)-1)}' $f >$f.parsed; done
echo "]" >>$HARD_LOCATION
