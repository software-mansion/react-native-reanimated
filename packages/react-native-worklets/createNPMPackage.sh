#!/bin/bash

yarn install --immutable
yarn build

PREVIOUS_VERSION=$(node scripts/set-worklets-version.js "$@")
if [ $? -ne 0 ]; then
  exit 1
fi
npm pack
node scripts/set-worklets-version.js "$PREVIOUS_VERSION"

echo "Done!"
