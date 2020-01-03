#!/bin/bash -e

source $(dirname "$0")/../install.sh

cd e2e

yarn
cd ./android && ./gradlew assembleDebug