#!/bin/bash

MONOREPO_ROOT=$(git rev-parse --show-toplevel)
PATCHES_DIR="$MONOREPO_ROOT/scripts/patches"

cd "$MONOREPO_ROOT" || exit 1

PATCHES=("$PATCHES_DIR"/*.patch)

all_active=true
all_inactive=true
for p in "${PATCHES[@]}"; do
  git apply --reverse --check "$p" 2>/dev/null || all_active=false
  git apply --check "$p" 2>/dev/null || all_inactive=false
done

if $all_inactive; then
  echo "[Worklets] Bundle mode is already disabled."
  exit 0
fi

if ! $all_active; then
  echo "[Worklets] Cannot disable bundle mode: patches are in a mixed state."
  exit 1
fi

exec "$MONOREPO_ROOT/scripts/toggle-bundle-mode.sh"
