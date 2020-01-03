#!/bin/bash -e

$(dirname "$0")/install.sh

cd e2e

export CODE_SIGNING_REQUIRED=NO
HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_AUTO_UPDATE=1 brew tap wix/brew
HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_AUTO_UPDATE=1 brew install applesimutils

sudo ulimit -n 10000
sudo launchctl limit maxfiles 2048 unlimited

yarn
cd ios && pod install && cd ..
xcodebuild -workspace ios/e2e.xcworkspace -scheme e2e -configuration Debug -sdk iphonesimulator -derivedDataPath ./ios/build -UseModernBuildSystem=NO