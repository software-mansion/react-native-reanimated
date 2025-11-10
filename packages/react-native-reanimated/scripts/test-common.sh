#!/bin/bash

set -ex

BUILD_DIR="COMMON/tests/build"

REACT_NATIVE_DIR_PATH="$(pwd)/../../node_modules/react-native"

if [ ! -d "$REACT_NATIVE_DIR_PATH" ]; then
    echo "react-native node module not found"
    exit 1
fi

mkdir -p $BUILD_DIR

cd $BUILD_DIR

cmake -D CMAKE_BUILD_TYPE=Release -D REACT_NATIVE_DIR="$REACT_NATIVE_DIR_PATH" ..

cmake --build .

ctest --verbose

