#!/bin/bash

MONOREPO_ROOT=$(git rev-parse --show-toplevel)
PATCH_FILE="$MONOREPO_ROOT/scripts/patches/bundle-mode.patch"

cd "$MONOREPO_ROOT" || exit 1

if git apply --check "$PATCH_FILE" 2>/dev/null; then
  git apply "$PATCH_FILE"
  echo "[Worklets] Bundle mode has been toggled on."
elif git apply --reverse --check "$PATCH_FILE"; then
  git apply --reverse "$PATCH_FILE"
  echo "[Worklets] Bundle mode has been toggled off."
else
  echo "[Worklets] Failed to toggle bundle mode."
  exit 1
fi
