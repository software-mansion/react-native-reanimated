#!/bin/bash

PREVIOUS_VERSION=$(node scripts/set-reanimated-version.js $@)
if [ $? -ne 0 ]; then
  exit 1
fi
yarn install --frozen-lockfile
yarn bob build
npm pack
node scripts/set-reanimated-version.js $PREVIOUS_VERSION

echo "Done!"
