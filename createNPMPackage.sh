#!/bin/bash

yarn run type:generate
yarn --cwd ./plugin-swc/ build:plugin
if [ $1 = "nightly" ];
then
  node scripts/set-nightly-version.js
fi
npm pack

rm -rf ./lib

echo "Done!"
