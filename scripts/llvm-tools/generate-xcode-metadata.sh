#!/bin/bash
# THIS FILE WAS ENTIRELY AI GENERATED.

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

# React Native convention: load NODE_BINARY (set by nvm/fnm/mise or manually
# in .xcode.env / .xcode.env.local) so this script's `node` invocation works
# when node is managed by a version manager that isn't on the default PATH.
# shellcheck source=/dev/null
[ -f "${SRCROOT:-.}/.xcode.env" ] && . "${SRCROOT:-.}/.xcode.env"
# shellcheck source=/dev/null
[ -f "${SRCROOT:-.}/.xcode.env.local" ] && . "${SRCROOT:-.}/.xcode.env.local"
if [ -n "${NODE_BINARY:-}" ] && [ -x "$NODE_BINARY" ]; then
  node_dir="$(dirname "$NODE_BINARY")"
  export PATH="$node_dir:$PATH"
fi
if ! command -v node >/dev/null; then
  echo "warning: node not found on PATH (check .xcode.env / NODE_BINARY); skipping compile metadata generation" >&2
  exit 0
fi

xbs="$(command -v xcode-build-server || true)"
if [ -z "$xbs" ]; then
  echo "warning: xcode-build-server not found on PATH; skipping compile metadata generation" >&2
  exit 0
fi
echo "info: using xcode-build-server at $xbs" >&2

dd_base_custom="$(defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true)"
if [ -n "$dd_base_custom" ] && [ -d "$dd_base_custom" ]; then
  dd_base="$dd_base_custom"
  echo "info: using custom DerivedData at $dd_base" >&2
else
  dd_base="$HOME/Library/Developer/Xcode/DerivedData"
  echo "info: using default DerivedData at $dd_base" >&2
fi

project="${PROJECT_NAME:-}"
if [ -z "$project" ]; then
  echo "warning: PROJECT_NAME not set; skipping" >&2
  exit 0
fi
echo "info: project is $project" >&2

# Polls for the project's newest .xcactivitylog under DerivedData and waits
# for its size to stop growing — Xcode writes the log mid-build, so this
# build phase fires before it's fully flushed. Echoes the resolved path.
wait_for_stable_log() {
  local prev_size=0 stable=0 i=0
  local timeout_halfseconds=60   # 30s wall-clock
  local log=""
  while [ $i -lt $timeout_halfseconds ]; do
    log=$(find "$dd_base" -maxdepth 4 \
                -path "*/${project}-*/Logs/Build/*.xcactivitylog" \
                -print0 2>/dev/null \
          | xargs -0 stat -f '%m %N' 2>/dev/null \
          | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -n "$log" ]; then
      local size
      size=$(stat -f '%z' "$log" 2>/dev/null || echo 0)
      if [ "$size" = "$prev_size" ] && [ "$size" -gt 0 ]; then
        stable=$((stable + 1))
        if [ $stable -ge 2 ]; then
          printf '%s' "$log"
          return 0
        fi
      else
        stable=0
        prev_size=$size
      fi
    fi
    sleep 0.5
    i=$((i + 1))
  done
  return 1
}

(
  log=$(wait_for_stable_log)
  if [ -z "$log" ]; then
    echo "warning: timed out waiting for ${project}'s xcactivitylog under ${dd_base}" >&2
    exit 0
  fi

  "$xbs" parse "$log" -o ".xcode-compile-metadata" </dev/null >/dev/null 2>&1 || true

  if [ -f ".xcode-compile-metadata" ]; then
    for cpp_dir in "$repo_root"/packages/*/Common/cpp; do
      [ -d "$cpp_dir" ] || continue
      pkg_dir="${cpp_dir%/Common/cpp}"
      node "$script_dir/emit.js" \
        "$pkg_dir/compile_commands.json" \
        ".xcode-compile-metadata" \
        "$pkg_dir/android/.cxx"
    done
  fi
) &
disown
