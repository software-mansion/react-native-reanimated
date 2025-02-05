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
rm -r "$TYPESCRIPT_DEST_DIR"
copy_files_recursively "$TYPESCRIPT_DEST_DIR" "$WORKLETS_DIR/src/worklets"

IOS_SOURCE_DIR="$WORKLETS_DIR/apple/worklets"
rm -r "$IOS_SOURCE_DIR"
copy_files_recursively "apple/worklets" "$IOS_SOURCE_DIR"

ANDROID_JAVA_SOURCE_DIR="$WORKLETS_DIR/android/src/worklets"
rm -r "$ANDROID_JAVA_SOURCE_DIR"
copy_files_recursively "android/src/worklets" "$ANDROID_JAVA_SOURCE_DIR"

ANDROID_CPP_SOURCE_DIR="$WORKLETS_DIR/android/src/main/cpp/worklets"
rm -r "$ANDROID_CPP_SOURCE_DIR"
copy_files_recursively "android/src/main/cpp/worklets" "$ANDROID_CPP_SOURCE_DIR"

COMMON_CPP_SOURCE_DIR="$WORKLETS_DIR/Common/cpp/worklets"
rm -r "$COMMON_CPP_SOURCE_DIR"
copy_files_recursively "Common/cpp/worklets" "$COMMON_CPP_SOURCE_DIR"

echo "Done duplicating Worklets in Reanimated"
