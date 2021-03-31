#!/bin/bash
set -e
set -x

ROOT=$(pwd)

unset CI

versions=("0.64.0" "0.63.3" "0.62.2 --dev")
version_name=("64" "63" "62")

for index in {0..2}
do
  rm -rf ./android/src/main/jniLibs
  yarn add react-native@"${versions[$index]}"

  rm -rf android/build/outputs/aar/*.aar
  cd android 
  gradle clean

  gradle :assembleDebug
  cd $ROOT

  rm -rf android-npm/react-native-reanimated-"${version_name[$index]}".aar
  cp android/build/outputs/aar/*.aar android-npm/react-native-reanimated-"${version_name[$index]}".aar
done

yarn add react-native --dev

mv android android-temp
mv android-npm android

yarn run type:generate

npm pack

mv android android-npm
mv android-temp android

echo "Done!"
