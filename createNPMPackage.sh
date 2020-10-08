#!/bin/bash
set -e
set -x

ROOT=$(pwd)

# unset CI so all archs are built
unset CI

# PART I - I (install RN)
yarn add react-native --dev

# PART I - II (clean)

rm -rf android/build/outputs/aar/*.aar
cd android 
gradle clean

# PART I (add latest aar to android-npm)

gradle :assembleDebug
cd $ROOT

rm -rf android-npm/react-native-reanimated-63.aar
cp android/build/outputs/aar/*.aar android-npm/react-native-reanimated-63.aar

# PART II (clean)

rm -rf android/build/outputs/aar/*.aar
cd android 
gradle clean
cd $ROOT

# part III (add react-native 62 aar to android-npm)

yarn add react-native@0.62.2 --dev

cd android
gradle :assembleDebug
cd $ROOT

rm -rf android-npm/react-native-reanimated-62.aar
cp android/build/outputs/aar/*.aar android-npm/react-native-reanimated-62.aar

# PART IV (revert react-native change)

yarn add react-native --dev

# PART V (prepare android directory)

mv android android-temp
mv android-npm android

# PART VI (create package)

npm pack

# PART VII (clean)

mv android android-npm
mv android-temp android

echo "Done!"
