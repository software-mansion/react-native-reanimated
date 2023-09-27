#!/bin/bash

PREVIOUS_VERSION=$(node scripts/set-reanimated-version.js $@)
yarn install --frozen-lockfile
yarn bob build
npm pack
# To preserve previous behavior we don't set back the version on nightly.
if [ "$1" != "--nightly" ] && [ "$1" != "-n" ]; then
  node scripts/set-reanimated-version.js $PREVIOUS_VERSION
fi

echo "Done!"
