#!/bin/bash

if ! which "clang-tidy" >/dev/null; then
  echo "error: clang-tidy not installed, download \
  from https://clang.llvm.org/extra/clang-tidy/" 1>&2
  exit 1
fi

if [ ! -f ../../compile_commands.json ]; then
  echo "info: missing compile_commands.json, generating one"
  (
    cd ../../apps/fabric-example || exit 1
    yarn
    cd android && ./gradlew assembleDebug --build-cache -PreactNativeArchitectures=arm64-v8a
  )
fi

clang-tidy --quiet "$@"
