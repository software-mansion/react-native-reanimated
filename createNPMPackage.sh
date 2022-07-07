#!/bin/bash

yarn bob build
if [ $1 = "nightly" ];
then
  node scripts/set-nightly-version.js
fi
npm pack

echo "Done!"
