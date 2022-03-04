#!/bin/bash
set -e
set -x

ROOT=$(pwd)

unset CI

versions=("0.68.0-rc.2" "0.67.3" "0.66.3" "0.65.1" "0.64.3")
version_name=("68" "67" "66" "65" "64")

for index in {0..4}
do
  yarn add react-native@"${versions[$index]}"
  for for_hermes in "True" "False"
  do
    engine="jsc"
    if [ "$for_hermes" == "True" ]; then
      engine="hermes"
    fi
    echo "engine=${engine}"

    cd android 
    ./gradlew clean

    CLIENT_SIDE_BUILD="False" FOR_HERMES=${for_hermes} ./gradlew :assembleDebug --no-build-cache --rerun-tasks

    cd $ROOT

    rm -rf android/react-native-reanimated-"${version_name[$index]}-${engine}".aar
    cp android/build/outputs/aar/*.aar android/react-native-reanimated-"${version_name[$index]}-${engine}".aar
  done
done

yarn add react-native@"${versions[0]}" --dev

cp -R android-npm/expo android/
cp -R android/build build_output
cd android && ./gradlew clean && cd ..
yarn run type:generate
npm pack
rm -rf android/expo

rm -rf ./lib
rm -rf ./android/rnVersionPatch/backup/*
touch ./android/rnVersionPatch/backup/.gitkeep

echo "Done!"
