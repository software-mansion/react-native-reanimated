#!/bin/bash -e

source $(dirname "$0")/../install.sh

cd Example

echo 'Installing packages...'
yarn
echo 'Building Android app'
cd ./android && ./gradlew assembleDebug