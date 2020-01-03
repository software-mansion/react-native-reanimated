#!/bin/bash -e

source $(dirname "$0")/../install.sh

cd Example

yarn
cd ./android && ./gradlew assembleDebug