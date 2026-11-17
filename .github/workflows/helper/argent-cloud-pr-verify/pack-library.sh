#!/usr/bin/env bash
set -euo pipefail

main() {
  COMMIT="${1:?usage: pack-library.sh <commit> <output-dir>}"
  OUTPUT_DIR="${2:?usage: pack-library.sh <commit> <output-dir>}"
  REPOSITORY_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}.git"
  SOURCE_DIR="$(mktemp -d)"

  fetch_commit
  pack_packages
}

fetch_commit() {
  echo "Fetching $COMMIT from $REPOSITORY_URL"
  git init -q "$SOURCE_DIR"
  git -C "$SOURCE_DIR" -c core.hooksPath=/dev/null fetch -q --depth 1 --no-tags "$REPOSITORY_URL" "$COMMIT"
  git -C "$SOURCE_DIR" -c core.hooksPath=/dev/null checkout -q FETCH_HEAD
  [ "$(git -C "$SOURCE_DIR" rev-parse HEAD)" = "$COMMIT" ] || fail "fetched a commit other than $COMMIT"
}

pack_packages() {
  mkdir -p "$OUTPUT_DIR"
  OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"
  local package
  for package in react-native-worklets react-native-reanimated; do
    [ -d "$SOURCE_DIR/packages/$package" ] || continue
    (cd "$SOURCE_DIR/packages/$package" && npm pack --ignore-scripts --pack-destination "$OUTPUT_DIR")
  done
  [ -n "$(find "$OUTPUT_DIR" -maxdepth 1 -name 'react-native-reanimated-*.tgz')" ] \
    || fail "no react-native-reanimated package at $COMMIT"
}

fail() {
  echo "::error::$1"
  exit 1
}

main "$@"
