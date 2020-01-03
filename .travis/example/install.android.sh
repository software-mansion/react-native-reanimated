#!/bin/bash -e

$(dirname "$0")/install.sh

cd Example

yarn
cd ./android && ./gradlew assembleDebug