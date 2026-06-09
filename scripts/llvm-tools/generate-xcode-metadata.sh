#!/bin/bash
# THIS FILE WAS ENTIRELY AI GENERATED.

set -euo pipefail

trap 'echo "error: generate-xcode-metadata.sh exited at line $LINENO (last cmd: $BASH_COMMAND)" >&2' ERR

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

project="${PROJECT_NAME:-}"
if [ -z "$project" ]; then
  echo "warning: PROJECT_NAME not set; skipping" >&2
  exit 0
fi
echo "info: project is $project" >&2

# Resolve the workspace file Xcode is building. WORKSPACE_DIR is the dir
# that contains it; the file itself is conventionally <ProjectName>.xcworkspace
# (with .xcodeproj as a fallback for non-workspace projects).
workspace_dir="${WORKSPACE_DIR:-$(pwd)}"
workspace_path=""
for candidate in \
    "$workspace_dir/${project}.xcworkspace" \
    "$workspace_dir/${project}.xcodeproj"; do
  if [ -e "$candidate" ]; then
    workspace_path="$candidate"
    break
  fi
done
if [ -z "$workspace_path" ]; then
  echo "warning: could not locate workspace file for ${project} under ${workspace_dir}; skipping" >&2
  exit 0
fi
echo "info: workspace is $workspace_path" >&2

# Resolve the per-workspace DerivedData folder by checking every plausible
# DerivedData base for a `${project}-<hash>` folder whose info.plist's
# WorkspacePath matches the workspace we're building. This is necessary
# because Xcode disambiguates concurrent workspaces (e.g. git worktrees with
# the same project name) only by the hash suffix; a naive `${project}-*`
# glob would also match the other worktrees' folders.
#
# Searched bases, in order:
#   1. Custom DerivedData location set in Xcode → Preferences → Locations.
#   2. Workspace-relative DerivedData (`<workspace-dir>/DerivedData/`),
#      used when Xcode's Derived Data option is set to "Relative".
#   3. The default `~/Library/Developer/Xcode/DerivedData/`.
custom_dd="$(defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true)"
dd_bases=()
[ -n "$custom_dd" ] && [ -d "$custom_dd" ] && dd_bases+=("$custom_dd")
[ -d "$workspace_dir/DerivedData" ] && dd_bases+=("$workspace_dir/DerivedData")
[ -d "$HOME/Library/Developer/Xcode/DerivedData" ] && dd_bases+=("$HOME/Library/Developer/Xcode/DerivedData")

dd_proj=""
for base in "${dd_bases[@]:+${dd_bases[@]}}"; do
  for candidate in "$base"/"${project}"-*; do
    [ -d "$candidate" ] || continue
    plist="$candidate/info.plist"
    [ -f "$plist" ] || continue
    plist_workspace="$(plutil -extract WorkspacePath raw "$plist" 2>/dev/null || true)"
    if [ "$plist_workspace" = "$workspace_path" ]; then
      dd_proj="$candidate"
      break 2
    fi
  done
done

if [ -z "$dd_proj" ]; then
  echo "warning: could not find DerivedData folder matching $workspace_path; skipping" >&2
  echo "         (searched: ${dd_bases[*]:-(no candidates)})" >&2
  exit 0
fi
echo "info: using DerivedData $dd_proj" >&2

# Polls $dd_proj/Logs/Build/ for the newest .xcactivitylog and waits for its
# size to stop growing — Xcode writes the log mid-build, so this build phase
# fires before it's fully flushed. Echoes the resolved path.
wait_for_stable_log() {
  local prev_size=0 stable=0 i=0
  local timeout_halfseconds=60   # 30s wall-clock
  local log=""
  while [ $i -lt $timeout_halfseconds ]; do
    log=$(find "$dd_proj/Logs/Build" -maxdepth 1 -name '*.xcactivitylog' -print0 2>/dev/null \
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
  return 0
}

run_pipeline() {
  log=$(wait_for_stable_log)
  if [ -z "$log" ]; then
    echo "warning: timed out waiting for ${project}'s xcactivitylog under ${dd_proj}" >&2
    return 0
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
}

# Decide foreground vs background.
# - On CI the script is invoked as a standalone workflow step after
#   xcodebuild (the build phase is unregistered by add-xcode-step.rb in that
#   environment). We run inline so the DB is on disk by the time the step
#   exits — backgrounding would just get SIGTERM'd when the step ends.
# - Locally the script runs from Xcode's build phase, which blocks the build
#   until we exit. wait_for_stable_log can't complete until the build does,
#   so backgrounding is mandatory to avoid deadlock.
if [ "${CI:-}" = "true" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  run_pipeline
else
  run_pipeline &
  disown
fi
