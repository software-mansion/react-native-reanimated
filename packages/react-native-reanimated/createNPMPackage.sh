#!/bin/bash

yarn install --immutable

if [ $# -ge 1 ]; then
  if ! CURRENT_VERSION=$(node scripts/set-reanimated-version.js "$@"); then
    exit 1
  fi
fi

yarn build

npm pack

if [ $# -ge 1 ]; then
  node scripts/set-reanimated-version.js "$CURRENT_VERSION" >/dev/null
fi

echo "Done!"
