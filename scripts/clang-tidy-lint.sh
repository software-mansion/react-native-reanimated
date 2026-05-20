#!/bin/bash

if [ ! -f "compile_commands.json" ]; then
  echo "info: missing compile_commands.json, generating one"
  (
    cd ../../apps/fabric-example || exit 1
    yarn
    cd android && ./gradlew :react-native-worklets:assembleDebug :react-native-reanimated:assembleDebug --build-cache -PreactNativeArchitectures=arm64-v8a
  )
fi

# Pick the clang-tidy that matches the toolchain in the compilation database.
# The first entry's clang++ path points at the bin dir of either the NDK or
# the LLVM toolchain. If that bin dir ships clang-tidy, prefer it — its
# binary understands its own PCH format, target flags, and sysroot. The
# Apple Xcode toolchain doesn't ship clang-tidy, so iOS-derived DBs fall
# through to whatever is on PATH (typically a Homebrew/hand-installed LLVM).
toolchain_bin="$(grep -oE '/[^ "]+/clang\+\+' compile_commands.json | head -1 | xargs dirname)"
if [ -x "$toolchain_bin/clang-tidy" ]; then
  clang_tidy_binary="$toolchain_bin/clang-tidy"
  if [ -x "$toolchain_bin/run-clang-tidy" ]; then
    run_clang_tidy="$toolchain_bin/run-clang-tidy"
    export PATH="$toolchain_bin:$PATH"
  fi
fi
clang_tidy_binary="${clang_tidy_binary:-clang-tidy}"
# run_clang_tidy="${run_clang_tidy:-run-clang-tidy}"
run_clang_tidy="/opt/llvm-22.1.6/bin/run-clang-tidy"

if ! command -v "$run_clang_tidy" >/dev/null; then
  echo "error: run-clang-tidy not found; install LLVM or use an NDK that ships clang-tidy" >&2
  exit 1
fi

echo "info: using ${clang_tidy_binary}" >&2

# When invoked as `... .` (the default from package.json), scope the lint to
# the current package directory so we don't lint everything that happens to
# live in the compilation database (Pods, RN core, etc.). For any other
# argument, treat it as a literal regex passed straight through.
if [ "${1-.}" = "." ]; then
  pkg_path="$(pwd)"
  file_regex="^${pkg_path}/"
  header_regex="^${pkg_path}/.*\\.h$"
else
  file_regex="$1"
  header_regex="^.*/$1/.*\\.h$"
fi

"$run_clang_tidy" -quiet -p . -clang-tidy-binary "$clang_tidy_binary" \
  -extra-arg=-Wno-unused-command-line-argument \
  -header-filter="$header_regex" "$file_regex" 2>&1 \
  | awk '
      /^\[[0-9]+\/[0-9]+\]\[/ { files++; next }
      /: error: /   { errors++;   print; next }
      /: warning: / { warnings++; print; next }
      { print }
      END {
        printf "\n--- linted %d files, %d errors, %d warnings ---\n",
               files, errors, warnings
      }
    '
