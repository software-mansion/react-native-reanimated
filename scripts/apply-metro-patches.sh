#!/bin/bash

CWD=$(pwd)

METRO_DIR=$1

if [ -z "$METRO_DIR" ]; then
  echo "Error: METRO_DIR argument is required"
  exit 1
fi

rm -fr node_modules/metro-babel-transformer/src
rm -fr node_modules/metro-resolver/src
rm -fr node_modules/metro-transform-worker/src
rm -fr node_modules/metro/src


cd "$METRO_DIR" || exit 1

yarn
yarn build
yarn run publish

cp -r packages/metro-babel-transformer/src "$CWD/node_modules/metro-babel-transformer/src"
cp -r packages/metro-resolver/src "$CWD/node_modules/metro-resolver/src"
cp -r packages/metro-transform-worker/src "$CWD/node_modules/metro-transform-worker/src"
cp -r packages/metro/src "$CWD/node_modules/metro/src"

yarn run cleanup-release

cd "$CWD" || exit 1

yarn patch-package metro-babel-transformer
yarn patch-package metro-resolver
yarn patch-package metro-transform-worker
yarn patch-package metro

for patch in patches/*.patch; do
  filename=$(basename "$patch" .patch)
  filename="${filename%%+*}"
  echo "Processing $filename"
  sed -i '' "s|node_modules/${filename}/||g" "$patch"
done

cp -r patches/* .yarn/patches/
