#!/bin/bash

copy_files_recursively() {
  local src_dir=$1
  local dest_dir=$2

  mkdir -p "$dest_dir"

  for file in "$src_dir"/*; do
    if [ -d "$file" ]; then
      echo "Recursing into $file"
      copy_files_recursively "$file" "$dest_dir/$(basename "$file")"
    else
      ln "$file" "$dest_dir/"
    fi
  done
}

mkdir -p apple/duplicated/worklets/
copy_files_recursively "../react-native-reanimated/apple/worklets" "apple/duplicated/worklets"

mkdir -p android/src/duplicated/worklets
copy_files_recursively "../react-native-reanimated/android/src/worklets" "android/src/duplicated/worklets"

mkdir -p android/src/duplicated/main/cpp/worklets/android
copy_files_recursively "../react-native-reanimated/android/src/main/cpp/worklets/android" "android/src/duplicated/main/cpp/worklets/android"

mkdir -p Common/duplicated/cpp/worklets
copy_files_recursively "../react-native-reanimated/Common/cpp/worklets" "Common/duplicated/cpp/worklets"
