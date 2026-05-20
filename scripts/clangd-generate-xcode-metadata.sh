#!/bin/bash
set -euo pipefail

# Invoked as an Xcode build phase from `apps/fabric-example/ios`.
# Delegates to xcode-build-server, which parses Xcode's xcactivitylog
# into `.compile` (a clang-compatible JSON array) and we then publish
# that as `compile_commands.json` for clangd.

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

# Resolve the DerivedData base directory.
# Xcode honors a custom DerivedData location set in Preferences → Locations.
# Build artifacts (OBJROOT/SYMROOT) may be redirected to a custom build
# location, but xcactivitylog files always live under DerivedData.
dd_base="$(defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true)"
if [ -z "$dd_base" ] || [ ! -d "$dd_base" ]; then
  dd_base="$HOME/Library/Developer/Xcode/DerivedData"
fi

project="${PROJECT_NAME:-}"
if [ -z "$project" ]; then
  echo "warning: PROJECT_NAME not set; skipping" >&2
  exit 0
fi

# Detach so the build phase returns immediately and so parse runs after Xcode
# has flushed *this* build's xcactivitylog (script_phase fires before that
# happens).
(
  sleep 3

  # Find the latest xcactivitylog under <dd-base>/<project>-<hash>/Logs/Build.
  log=$(find "$dd_base" -maxdepth 4 \
              -path "*/${project}-*/Logs/Build/*.xcactivitylog" \
              -print0 2>/dev/null \
        | xargs -0 stat -f '%m %N' 2>/dev/null \
        | sort -rn | head -1 | cut -d' ' -f2-)
  if [ -z "$log" ]; then
    echo "warning: no xcactivitylog for ${project} under ${dd_base}" >&2
    exit 0
  fi

  "$xbs" parse "$log" </dev/null >/dev/null 2>&1 || true

  # Filter xcode-build-server's BSP-style `.compile` into the standard JSON
  # Compilation Database shape that both clangd and clang-tidy accept.
  if [ -f ".compile" ]; then
    node "$script_dir/clangd-filter-compile-commands.js"

    # Publish a per-package DB that merges the iOS DB with the latest
    # gradle/cmake-produced Android DBs (if present). Each file's entry
    # comes from the freshest source it appears in, so editing iOS-only
    # files keeps working after an Android build and vice versa.
    for pkg in react-native-reanimated react-native-worklets; do
      pkg_dir="../../../packages/$pkg"
      node "$script_dir/clangd-merge-compile-commands.js" \
        "$pkg_dir/compile_commands.json" \
        "compile_commands.json" \
        "$pkg_dir/android/.cxx"
    done
  fi
) &
disown
