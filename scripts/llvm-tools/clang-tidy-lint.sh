#!/bin/bash
# THIS FILE WAS ENTIRELY AI GENERATED.

# Usage: clang-tidy-lint.sh [scope-regex] [--platform=ios|android] [--verbose]
#   scope-regex:        "." (the package directory) or a literal regex.
#   --platform=PLATFORM "ios" | "android" — filter compile_commands.json to
#                       entries built for that platform. Omit to lint every
#                       entry in the DB.
#   --verbose, -v       Echo each file being linted (otherwise progress lines
#                       are suppressed and only diagnostics + a final summary
#                       print).
#
# When --platform is set, the script picks the toolchain best suited for it
# (LLVM for iOS — Apple's toolchain ships no clang-tidy; NDK for Android with
# LLVM fallback).

set -e
set -o pipefail

verbose=0
platform=""
positional=()
while [ $# -gt 0 ]; do
  case "$1" in
    --verbose|-v) verbose=1 ;;
    --platform=*) platform="${1#--platform=}" ;;
    --platform) platform="${2:-}"; shift ;;
    *) positional+=("$1") ;;
  esac
  shift
done

scope="${positional[0]:-.}"

script_dir="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "compile_commands.json" ]; then
  echo "error: compile_commands.json is missing in $(pwd)" >&2
  echo "       build the package first so the compile database is generated:" >&2
  echo "         - iOS:     pod install + a build of apps/fabric-example in Xcode" >&2
  echo "         - Android: a gradle build of apps/fabric-example/android" >&2
  echo "       see scripts/llvm-tools/README.md" >&2
  exit 1
fi

case "$platform" in
  ios|android|"") ;;
  *) echo "error: platform must be 'ios', 'android', or empty (got '$platform')" >&2; exit 1 ;;
esac

# Filter the DB by platform if requested. `run-clang-tidy -p` needs a
# *directory* containing a compile_commands.json — it appends the basename
# itself — so we write the filtered DB into a fresh tempdir.
db_dir="$(pwd)"
if [ -n "$platform" ]; then
  filtered_dir="$(mktemp -d "${TMPDIR:-/tmp}/clang-tidy-${platform}.XXXXXX")"
  trap 'rm -rf "$filtered_dir"' EXIT
  node "$script_dir/filter-platform.js" \
       "$(pwd)/compile_commands.json" \
       "$platform" \
       "$filtered_dir/compile_commands.json"
  db_dir="$filtered_dir"
fi

# Pick the clang-tidy binary.
# - iOS: Apple's toolchain has no clang-tidy → always fall back to PATH (LLVM).
# - Android: prefer NDK's clang-tidy if available (it understands the NDK's
#   PCH format and target triple), otherwise fall back to PATH.
# - No platform: auto-detect from the first clang++ path in the DB.
clang_tidy_binary=""
run_clang_tidy=""
if [ "$platform" != "ios" ]; then
  toolchain_bin="$(grep -oE '/[^ "]+/clang\+\+' "$db_dir/compile_commands.json" | head -1 | xargs dirname 2>/dev/null || true)"
  if [ -n "$toolchain_bin" ] && [ -x "$toolchain_bin/clang-tidy" ]; then
    clang_tidy_binary="$toolchain_bin/clang-tidy"
    if [ -x "$toolchain_bin/run-clang-tidy" ]; then
      run_clang_tidy="$toolchain_bin/run-clang-tidy"
      export PATH="$toolchain_bin:$PATH"
    fi
  fi
fi
clang_tidy_binary="${clang_tidy_binary:-clang-tidy}"
run_clang_tidy="${run_clang_tidy:-run-clang-tidy}"

# `command -v` only checks $PATH. Apple Silicon shells often don't include
# `/usr/local/bin`, and Homebrew's `llvm` formula isn't auto-symlinked. Search
# common install locations explicitly so the script works without the user
# having to fiddle with their shell rc.
LLVM_FALLBACKS=(
  "/opt/homebrew/opt/llvm/bin"
  "/usr/local/opt/llvm/bin"
  "/opt/homebrew/bin"
  "/usr/local/bin"
)
resolve_binary() {
  local name="$1"
  local first="$2"
  local found
  found="$(command -v "$first" 2>/dev/null || true)"
  if [ -n "$found" ]; then printf '%s' "$found"; return; fi
  for dir in "${LLVM_FALLBACKS[@]}"; do
    if [ -x "$dir/$name" ]; then printf '%s' "$dir/$name"; return; fi
  done
}

resolved_tidy="$(resolve_binary clang-tidy "$clang_tidy_binary")"
resolved_runner="$(resolve_binary run-clang-tidy "$run_clang_tidy")"

if [ -z "$resolved_runner" ]; then
  echo "error: run-clang-tidy not found on PATH or under ${LLVM_FALLBACKS[*]}" >&2
  echo "       install LLVM (brew install llvm) or use an NDK that ships clang-tidy" >&2
  exit 1
fi
if [ -z "$resolved_tidy" ]; then
  echo "error: clang-tidy not found on PATH or under ${LLVM_FALLBACKS[*]}" >&2
  exit 1
fi

# Prepend the resolved tool's dir so run-clang-tidy's child clang-tidy invocations also see it.
tidy_dir="$(dirname "$resolved_tidy")"
export PATH="$tidy_dir:$PATH"

label="${platform:-all}"
echo "info: linting $label files with $resolved_tidy" >&2

# When invoked as `... .` (the default from package.json), scope the lint to
# the current package directory so we don't lint everything that happens to
# live in the compilation database (Pods, RN core, etc.). For any other
# argument, treat it as a literal regex passed straight through.
if [ "$scope" = "." ]; then
  pkg_path="$(pwd)"
  # Enumerate authored source subdirs explicitly. Avoids negative lookahead
  # (unsupported by clang-tidy's llvm::Regex for -header-filter), and
  # naturally excludes Pods, build/, .cxx/, and codegen outputs.
  sources="(Common|apple|android/src)"
  file_regex="^${pkg_path}/${sources}/"
  header_regex="^${pkg_path}/${sources}/.*\\.h$"
else
  file_regex="$scope"
  header_regex="^.*/$scope/.*\\.h$"
fi

"$run_clang_tidy" -quiet -p "$db_dir" -clang-tidy-binary "$clang_tidy_binary" \
  -extra-arg=-Wno-unused-command-line-argument \
  -header-filter="$header_regex" "$file_regex" 2>&1 \
  | awk -v label="$label" -v verbose="$verbose" '
      /^\[[ ]*[0-9]+\/[0-9]+\]\[/ { files++; if (verbose) print $NF; next }
      /^[0-9]+ warnings? generated\.?$/ { next }
      /^[[:space:]]*$/ { next }
      /: error: /   { errors++;   print; next }
      /: warning: / { warnings++; print; next }
      { print }
      END {
        printf "\n--- [%s] linted %d files, %d errors, %d warnings ---\n\n",
               label, files, errors, warnings
      }
    '
