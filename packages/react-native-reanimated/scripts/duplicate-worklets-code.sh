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

# Worklets TypeScript files
copy_files_recursively "src/worklets" "$WORKLETS_DIR/src/worklets"

# Worklets iOS files
copy_files_recursively "apple/worklets" "$WORKLETS_DIR/apple/worklets"

# Worklets Android files
# Note that we don't duplicate "android/src/main"
copy_files_recursively "android/src/worklets" "$WORKLETS_DIR/android/src/worklets"

# Worklets Android-specific cpp files
copy_files_recursively "android/src/main/cpp/worklets" "$WORKLETS_DIR/android/src/main/cpp/worklets"

# Worklets Common cpp files
copy_files_recursively "Common/cpp/worklets" "$WORKLETS_DIR/Common/cpp/worklets"

echo "Done duplicating Worklets in Reanimated"
