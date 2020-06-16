#!/bin/bash
set -e

ROOT=$(pwd)

# part I - I (clear old aar)

rm -rf android/build/outputs/aar/*.aar
cd android 
gradle clean

# part I (prepare android-npm)

gradle :assembleDebug
cd $ROOT

rm -rf android-npm/react-native-reanimated.aar
cp android/build/outputs/aar/*.aar android-npm/react-native-reanimated.aar

mv android android-temp
mv android-npm android

# PART II (create package)

npm pack

# PART III (clean)

mv android android-npm
mv android-temp android

echo "Done!"
