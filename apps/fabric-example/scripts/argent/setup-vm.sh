#!/bin/sh

# First step of the Argent Cloud remote build (see apps/fabric-example/argent-build.yaml).
# Runs inside the build VM with the monorepo root as the working directory.
#
# Installs a minimal Rust toolchain when the VM image has none: `yarn build`
# in packages/react-native-reanimated compiles the Worklets Oxc plugin with
# cargo. The toolchain lands in ~/.cargo/bin, which the build step puts on
# its PATH.

set -eu

xcodebuild -version

if command -v cargo > /dev/null 2>&1 || [ -x "$HOME/.cargo/bin/cargo" ]; then
  echo "cargo already available"
else
  echo "installing a minimal Rust toolchain (the Worklets Oxc plugin needs cargo)"
  curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --no-modify-path
fi
"$HOME/.cargo/bin/cargo" --version 2> /dev/null || cargo --version
