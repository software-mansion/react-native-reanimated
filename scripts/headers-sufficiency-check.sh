#!/bin/sh
set -e

ROOT_DIR=$(git rev-parse --show-toplevel)
BUILD_DIR=$ROOT_DIR/headers-sufficiency-check

mkdir $BUILD_DIR
cd $BUILD_DIR

ANDROID_PREFAB_CMAKE_DIR=../android/.cxx/Debug/1e3q424l/prefab/x86_64/prefab/lib/x86_64-linux-android/cmake
ANDROID_NDK_DIR=~/Library/Android/sdk/ndk/23.1.7779620

cmake ../android \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_DIR/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=x86_64 \
  -DANDROID_PLATFORM=android-31 \
  -Dfbjni_DIR=$ANDROID_PREFAB_CMAKE_DIR/fbjni \
  -DReactAndroid_DIR=$ANDROID_PREFAB_CMAKE_DIR/ReactAndroid \
  -Dhermes-engine_DIR=$ANDROID_PREFAB_CMAKE_DIR/hermes-engine \
  -DREACT_NATIVE_MINOR_VERSION=72 \
  -DJS_RUNTIME=hermes \
  -DREACT_NATIVE_DIR=../node_modules/react-native \
  -DIS_NEW_ARCHITECTURE_ENABLED=1 \
  -DHERMES_ENABLE_DEBUGGER=1 \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCHECK_HEADERS=1

make -j8
