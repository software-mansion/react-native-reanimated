#!/bin/bash

MONOREPO_ROOT=$(git rev-parse --show-toplevel)
PATCHES_DIR="$MONOREPO_ROOT/scripts/patches"

cd "$MONOREPO_ROOT" || exit 1

PATCHES=("$PATCHES_DIR"/*.patch)

can_apply_all=true
can_reverse_all=true
for p in "${PATCHES[@]}"; do
  git apply --check "$p" 2>/dev/null || can_apply_all=false
  git apply --reverse --check "$p" 2>/dev/null || can_reverse_all=false
done

if $can_apply_all; then
  for p in "${PATCHES[@]}"; do git apply "$p"; done
  YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install
  echo "[Worklets] Bundle mode has been toggled on."
elif $can_reverse_all; then
  for p in "${PATCHES[@]}"; do git apply --reverse "$p"; done
  YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install
  echo "[Worklets] Bundle mode has been toggled off."
else
  echo "[Worklets] Failed to toggle bundle mode (patches in mixed state)."
  echo "[Worklets] Per-patch status:"
  for p in "${PATCHES[@]}"; do
    if git apply --check "$p" 2>/dev/null; then
      echo "  forward:  $(basename "$p")"
    elif git apply --reverse --check "$p" 2>/dev/null; then
      echo "  reverse:  $(basename "$p")"
    else
      echo "  conflict: $(basename "$p")"
    fi
  done
  exit 1
fi
