#!/bin/bash

echo "Duplicating Worklets in Reanimated"

copy_files_recursively() {
  local dest_dir=$1
  local src_dir=$2

  mkdir -p "$dest_dir"

  for file in "$src_dir"/*; do
    if [ -d "$file" ]; then
      copy_files_recursively "$dest_dir/$(basename "$file")" "$file"
    else
      echo "    Linking $(basename "$file") in Reanimated"
      ln -f "$file" "$dest_dir/$(basename "$file")"
    fi
  done
}

WORKLETS_DIR="../react-native-worklets"

if [ ! -d "$WORKLETS_DIR" ]; then
  echo "Please run this script from react-native-reanimated package"
  exit 1
fi

TYPESCRIPT_DEST_DIR="src/worklets"
rm -fr "$TYPESCRIPT_DEST_DIR"
copy_files_recursively "$TYPESCRIPT_DEST_DIR" "$WORKLETS_DIR/src/worklets"

IOS_DEST_DIR="apple/worklets"
rm -fr "$IOS_DEST_DIR"
copy_files_recursively "$IOS_DEST_DIR" "$WORKLETS_DIR/apple/worklets"

ANDROID_JAVA_DEST_DIR="android/src/worklets"
rm -fr "$ANDROID_JAVA_DEST_DIR"
copy_files_recursively "$ANDROID_JAVA_DEST_DIR" "$WORKLETS_DIR/android/src/worklets"

ANDROID_CPP_DEST_DIR="android/src/main/cpp/worklets"
rm -fr "$ANDROID_CPP_DEST_DIR"
copy_files_recursively "$ANDROID_CPP_DEST_DIR" "$WORKLETS_DIR/android/src/main/cpp/worklets"

COMMON_CPP_DEST_DIR="Common/cpp/worklets"
rm -fr "$COMMON_CPP_DEST_DIR"
copy_files_recursively "$COMMON_CPP_DEST_DIR" "$WORKLETS_DIR/Common/cpp/worklets"

echo "Done duplicating Worklets in Reanimated"
