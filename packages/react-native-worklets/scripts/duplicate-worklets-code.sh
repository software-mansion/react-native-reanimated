#!/bin/bash

copy_files() {
  local dest_dir=$1
  shift
  local files=("$@")

  mkdir -p "$dest_dir"

  for file in "${files[@]}"; do
    if [ -d "$file" ]; then
      pass
    else
      ln -h "$file" "$dest_dir/"
    fi
  done
}

copy_files_recursively() {
  local dest_dir=$1
  local src_dir=$2

  mkdir -p "$dest_dir"

  for file in "$src_dir"/*; do
    if [ -d "$file" ]; then
      echo "Recursing into $file"
      copy_files_recursively "$dest_dir/$(basename "$file")" "$file"
    else
      ln -h "$file" "$dest_dir"
    fi
  done
}

REANIMATED_DIR="../react-native-reanimated"

if [ ! -d "$REANIMATED_DIR" ]; then
  echo "Please run this script from react-native-worklets package"
  exit 1
fi

copy_files "src/duplicated" "$REANIMATED_DIR/src/PlatformChecker.ts" "$REANIMATED_DIR/src/commonTypes.ts" "$REANIMATED_DIR/src/workletTypes.ts" "$REANIMATED_DIR/src/workletsExtraDuplicationFiles/specs.ts"

copy_files_recursively "apple/duplicated/worklets" "$REANIMATED_DIR/apple/worklets"

copy_files_recursively "android/src/duplicated/worklets" "$REANIMATED_DIR/android/src/worklets"

copy_files_recursively "android/src/duplicated/main/cpp/worklets/android" "$REANIMATED_DIR/android/src/main/cpp/worklets/android"

copy_files_recursively "Common/duplicated/cpp/worklets" "$REANIMATED_DIR/Common/cpp/worklets"

copy_files_recursively "src/duplicated/worklets" "$REANIMATED_DIR/src/worklets"
