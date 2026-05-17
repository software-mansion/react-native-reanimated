#!/bin/bash

if ! which run-clang-tidy >/dev/null; then
  echo "error: run-clang-tidy not installed, download \
  from https://clang.llvm.org/extra/clang-tidy/" 1>&2
  exit 1
fi

if [ ! -f "compile_commands.json" ]; then
  echo "info: missing compile_commands.json, generating one"
  (
    cd ../../apps/fabric-example || exit 1
    yarn
    cd android && ./gradlew assembleDebug --build-cache -PreactNativeArchitectures=arm64-v8a
  )
fi

# Only diagnose headers under the current package directory, so we don't pick up
# findings from system headers, fbjni, react-native, hermes, etc.
run-clang-tidy -quiet -p . -header-filter="^${PWD}/.*\.h$" .
