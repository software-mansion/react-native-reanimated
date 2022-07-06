#!/bin/bash

if [ $1 = "nightly" ];
then
  node scripts/set-nightly-version.js
fi
npm pack

echo "Done!"
