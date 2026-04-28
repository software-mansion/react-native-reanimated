#!/bin/bash

yarn install --immutable

if [ $# -ge 1 ]; then
  if ! CURRENT_VERSION=$(node scripts/set-version.js "$@"); then
    exit 1
  fi
fi

yarn build

npm pack

if [ $# -ge 1 ]; then
  node scripts/set-version.js --version "$CURRENT_VERSION" >/dev/null
fi

echo "Done!"
