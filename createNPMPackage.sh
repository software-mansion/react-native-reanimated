#!/bin/bash
set -e
set -x

ROOT=$(pwd)

unset CI

versions=("0.65.0-rc.2" "0.64.1" "0.63.3" "0.62.2 --dev")
version_name=("65" "64" "63" "62")

for index in {0..3}
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
    gradle clean

    FOR_HERMES=${for_hermes} gradle :assembleDebug
    cd $ROOT

    rm -rf android-npm/react-native-reanimated-"${version_name[$index]}-${engine}".aar
    cp android/build/outputs/aar/*.aar android-npm/react-native-reanimated-"${version_name[$index]}-${engine}".aar
  done
done

yarn add react-native@0.64.1 --dev

mv android android-temp
mv android-npm android

yarn run type:generate

npm pack

mv android android-npm
mv android-temp android

echo "Done!"
