#!/bin/bash
set -e
set -x

yarn run type:generate

mv android android-temp
mv android-npm android

npm pack

mv android android-npm
mv android-temp android

echo "Done!"
