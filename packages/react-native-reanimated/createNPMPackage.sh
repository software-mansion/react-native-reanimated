#!/bin/bash

yarn install --immutable
yarn bob build

PREVIOUS_VERSION=$(node scripts/set-reanimated-version.js "$@")
if [ $? -ne 0 ]; then
  exit 1
fi
npm pack
node scripts/set-reanimated-version.js "$PREVIOUS_VERSION"

echo "Done!"
