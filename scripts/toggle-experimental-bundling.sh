#!/bin/bash

MONOREPO_ROOT=$(git rev-parse --show-toplevel)
PATCH_FILE="$MONOREPO_ROOT/scripts/patches/experimental-bundling.patch"
if git apply --check "$PATCH_FILE" 2>/dev/null; then
  git apply "$PATCH_FILE"
  echo "Experimental bundling has been toggled on."
elif git apply --reverse --check "$PATCH_FILE"; then
  git apply --reverse "$PATCH_FILE"
  echo "Experimental bundling has been toggled off."
else
  echo "Failed to toggle experimental bundling."
  exit 1
fi
