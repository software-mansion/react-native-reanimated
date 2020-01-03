#!/bin/bash -e

source $(dirname "$0")/../install.sh

cd Example

echo 'Installing applesimutils via brew'
export CODE_SIGNING_REQUIRED=NO
HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_AUTO_UPDATE=1 brew tap wix/brew
HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_AUTO_UPDATE=1 brew install applesimutils

echo 'Changing ulimit'
sudo ulimit -n 10000
sudo launchctl limit maxfiles 2048 unlimited

echo 'Installing packages in e2e'
yarn
echo 'Installing pods'
cd ios && pod install && cd ..
echo 'Building xcode project'
xcodebuild -workspace ./ios/ReanimatedExample.xcworkspace -scheme ReanimatedExample -configuration Debug -sdk iphonesimulator -derivedDataPath ./ios/build -UseModernBuildSystem=NO
