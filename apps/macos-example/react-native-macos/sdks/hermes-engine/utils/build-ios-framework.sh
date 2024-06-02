#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Given a specific target, retrieve the right architecture for it
# $1 the target you want to build. Allowed values: iphoneos, iphonesimulator, catalyst
function get_architecture {
    if [[ $1 == "iphoneos" ]]; then
      echo "arm64"
    elif [[ $1 == "iphonesimulator" ]]; then
      echo "x86_64;arm64"
    elif [[ $1 == "catalyst" ]]; then
      echo "x86_64;arm64"
    else
      echo "Error: unknown arkitecture passed $1"
      exit 1
    fi
}

# build a single framework
# $1 is the target to build
function build_framework {
  if [ ! -d destroot/Library/Frameworks/universal/hermes.xcframework ]; then
    ios_deployment_target=$(get_ios_deployment_target)

    architecture=$(get_architecture "$1")

    build_apple_framework "$1" "$architecture" "$ios_deployment_target"
  else
    echo "Skipping; Clean \"destroot\" to rebuild".
  fi
}

# group the frameworks together to create a universal framework
function build_universal_framework {
    if [ ! -d destroot/Library/Frameworks/universal/hermes.xcframework ]; then
        create_universal_framework "iphoneos" "iphonesimulator" "catalyst"
    else
        echo "Skipping; Clean \"destroot\" to rebuild".
    fi
}

# single function that builds sequentially iphoneos, iphonesimulator and catalyst
# this is used to preserve backward compatibility
function create_framework {
    if [ ! -d destroot/Library/Frameworks/universal/hermes.xcframework ]; then
        ios_deployment_target=$(get_ios_deployment_target)

        build_framework "iphoneos"
        build_framework "iphonesimulator"
        build_framework "catalyst"

        build_universal_framework
    else
        echo "Skipping; Clean \"destroot\" to rebuild".
    fi
}


CURR_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=xplat/js/react-native-github/sdks/hermes-engine/utils/build-apple-framework.sh
. "${CURR_SCRIPT_DIR}/build-apple-framework.sh"

if [[ -z $1 ]]; then
  create_framework
elif [[ $1 == "build_framework" ]]; then
  build_universal_framework
else
  build_framework "$1"
fi
