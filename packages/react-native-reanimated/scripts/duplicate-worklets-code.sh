#!/bin/bash

copy_files_recursively() {
  local dest_dir=$1
  local src_dir=$2

  mkdir -p "$dest_dir"

  for file in "$src_dir"/*; do
    if [ -d "$file" ]; then
      echo "Recursing into $file"
      copy_files_recursively "$dest_dir/$(basename "$file")" "$file"
    else
      ln "$file" "$dest_dir/$(basename "$file")"
    fi
  done
}

# Worklets iOS files
copy_files_recursively "apple/worklets" "../react-native-worklets/apple/worklets"

# Worklets Android files
copy_files_recursively "android/src/worklets" "../react-native-worklets/android/src/worklets"

# Worklets Android-specific cpp files
copy_files_recursively "android/src/main/cpp/worklets" "../react-native-worklets/android/src/main/cpp/worklets"

# Worklets Common cpp files
copy_files_recursively "Common/cpp/worklets" "../react-native-worklets/Common/cpp/worklets"
