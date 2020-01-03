#!/bin/bash -e

source $(dirname "$0")/../install.sh

cd e2e

echo 'Installing packages...'
yarn
echo 'Building Android app'
cd ./android && ./gradlew assembleDebug