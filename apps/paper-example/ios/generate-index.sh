#!/bin/bash

export PATH="$PATH:/opt/homebrew/bin/"

for f in CompilationDatabase/*.json; do awk '{print substr($0, 0, length($0)-1)}' $f >$f.parsed; done
for f in Pods/CompilationDatabase/*.json; do awk '{print substr($0, 0, length($0)-1)}' $f >$f.parsed; done
jq -s '.' CompilationDatabase/*.parsed Pods/CompilationDatabase/*.parsed >../../../packages/react-native-reanimated/apple/compile_commands_hard.json
