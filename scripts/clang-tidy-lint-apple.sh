#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPILE_COMMANDS="compile_commands.json"
IOS_DIR="$SCRIPT_DIR/../apps/fabric-example/ios"

if [ $# -eq 0 ]; then
  echo "usage: $0 <target-directory>" >&2; exit 1
fi

if ! which run-clang-tidy >/dev/null; then
  echo "error: run-clang-tidy not installed, download \
  from https://clang.llvm.org/extra/clang-tidy/" 1>&2
  exit 1
fi

if [ ! -f "$COMPILE_COMMANDS" ]; then
  echo "info: missing compile_commands.json, generating one with xcodebuild"
  xcodebuild \
    -workspace "$IOS_DIR/FabricExample.xcworkspace" \
    -configuration Debug \
    -scheme "Debug FabricExample" \
    -destination "generic/platform=iOS Simulator" \
    -quiet
  if [ ! -f "$COMPILE_COMMANDS" ]; then
    echo "error: xcodebuild finished but compile_commands.json was not generated" >&2
    echo "       make sure the clangd build phase is added to the Xcode project (clangd-add-xcode-step.rb)" >&2
    exit 1
  fi
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

python3 "$SCRIPT_DIR/strip-apple-clang-flags.py" "$COMPILE_COMMANDS" "$TMPDIR/compile_commands.json"

run-clang-tidy -quiet -p "$TMPDIR" -header-filter="^.*/$1/.*\.h$" "$1"
