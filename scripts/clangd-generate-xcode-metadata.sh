#!/bin/bash
set -euo pipefail

# Invoked as an Xcode build phase from `apps/<app>/{ios,macos}`. Runs
# xcode-build-server against the current build's xcactivitylog and then
# publishes a merged compile_commands.json into each consumer package. See
# scripts/CLANGD.md.

# Xcode build phases inherit a minimal PATH; add Homebrew prefixes so
# tools installed via `brew install` (xcode-build-server) are discoverable.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Absolute path to this script's directory — captured before backgrounding
# so the subshell can find sibling helper scripts regardless of cwd.
script_dir="$(cd "$(dirname "$0")" && pwd)"

xbs="$(command -v xcode-build-server || true)"
if [ -z "$xbs" ]; then
  echo "warning: xcode-build-server not found on PATH; skipping clangd metadata generation" >&2
  exit 0
fi

# Resolve the DerivedData base. A custom location set in Xcode Preferences →
# Locations is honored; xcactivitylogs always live under DerivedData even
# when build artifacts (OBJROOT/SYMROOT) are redirected elsewhere.
dd_base="$(defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true)"
if [ -z "$dd_base" ] || [ ! -d "$dd_base" ]; then
  dd_base="$HOME/Library/Developer/Xcode/DerivedData"
fi

project="${PROJECT_NAME:-}"
if [ -z "$project" ]; then
  echo "warning: PROJECT_NAME not set; skipping" >&2
  exit 0
fi

# Wait for the newest xcactivitylog under DerivedData to stop growing,
# then echo its path on stdout. Replaces a fixed `sleep 3`.
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

  "$xbs" parse "$log" </dev/null >/dev/null 2>&1 || true

  if [ -f ".compile" ]; then
    for pkg in react-native-reanimated react-native-worklets; do
      pkg_dir="../../../packages/$pkg"
      node "$script_dir/clangd-publish.js" \
        "$pkg_dir/compile_commands.json" \
        ".compile" \
        "$pkg_dir/android/.cxx"
    done
  fi
) &
disown
