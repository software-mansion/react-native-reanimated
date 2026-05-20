#!/bin/bash

# Wrapper used by lint-staged in the pre-commit hook. Runs `clang-tidy --fix`
# on the staged C++ files passed as arguments, but skips gracefully if the
# local toolchain isn't ready (clang-tidy missing, compile_commands.json
# missing) so contributors aren't forced to run a full Android build before
# every commit. The full check still runs in CI via scripts/clang-tidy-lint.sh.

print() {
  echo "    [CLANG-TIDY]: $1" >&2
}

if [ "$#" -eq 0 ]; then
  exit 0
fi

if ! command -v clang-tidy >/dev/null 2>&1; then
  print "clang-tidy not installed, skipping. Install it to enable autofix on commit."
  exit 0
fi

if [ ! -f "compile_commands.json" ]; then
  print "No compile_commands.json in $(pwd), skipping."
  print "Run 'yarn workspace <package-name> lint:clang-tidy' once to generate it."
  exit 0
fi

clang-tidy --fix --quiet -p . "$@"
