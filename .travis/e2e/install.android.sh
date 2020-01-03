#!/bin/bash -e

source $(dirname "$0")/../install.sh

cd e2e

echo 'Installing packages...'
echo "Node version: $(node -v)"
yarn
echo 'Building Android app'
cd ./android && ./gradlew assembleDebug