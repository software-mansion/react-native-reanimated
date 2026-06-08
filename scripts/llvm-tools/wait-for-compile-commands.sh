#!/bin/bash
# THIS FILE WAS ENTIRELY AI GENERATED.

# Polls for compile_commands.json in every package that has a Common/cpp
# directory (the same set generate-xcode-metadata.sh publishes to). Used
# after an `xcodebuild` invocation whose backgrounded build phase emits
# those files asynchronously, before a step that needs them (e.g. clang-tidy).
#
# Usage: wait-for-compile-commands.sh [timeout-seconds]
#   timeout-seconds defaults to 90.

set -e

timeout="${1:-90}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

dbs=()
for cpp_dir in "$repo_root"/packages/*/Common/cpp; do
  [ -d "$cpp_dir" ] || continue
  pkg_dir="${cpp_dir%/Common/cpp}"
  dbs+=("$pkg_dir/compile_commands.json")
done

if [ "${#dbs[@]}" = 0 ]; then
  echo "warning: no packages with Common/cpp found under $repo_root/packages" >&2
  exit 0
fi

for i in $(seq 1 "$timeout"); do
  missing=0
  for db in "${dbs[@]}"; do
    [ -f "$db" ] || missing=1
  done
  if [ "$missing" = 0 ]; then
    echo "compile_commands.json present in all ${#dbs[@]} package(s) after ${i}s"
    exit 0
  fi
  sleep 1
done

echo "error: compile_commands.json not produced after ${timeout}s" >&2
for db in "${dbs[@]}"; do
  if [ -f "$db" ]; then
    echo "  found:   $db" >&2
  else
    echo "  missing: $db" >&2
  fi
done
exit 1
