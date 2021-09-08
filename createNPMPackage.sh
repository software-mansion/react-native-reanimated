#!/bin/bash
set -e
set -x

ROOT=$(pwd)

unset CI

versions=("0.65.1" "0.64.1" "0.63.3" "0.62.2 --dev")
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

    echo "APPLY PATCH"
    versionNumber=${version_name[$index]}
    cd ./rnVersionPatch/$versionNumber
    rm -rf ../backup/*
    cp -r . ../backup
    if [ "$(find . | grep 'java')" ];
    then 
      fileList=$(find . | grep -i 'java')
      for file in $fileList; do
        echo "COPY: $file"
        cp ../../src/main/java/com/swmansion/reanimated/$file ../backup/$file
        cp $file ../../src/main/java/com/swmansion/reanimated/$file
      done
    else
    pwd
      echo "NO PATCH";
    fi
    cd ../..

    ./gradlew clean

    FOR_HERMES=${for_hermes} ./gradlew :assembleDebug

    cd ./rnVersionPatch/$versionNumber
    if [ $(find . | grep 'java') ];
    then 
      echo "RESTORE BACKUP"
      for file in $fileList; do
        echo "BACKUP: $file"
        cp ../backup/$file ../../src/main/java/com/swmansion/reanimated/$file
      done
      echo "CLEAR BACKUP"
      rm -rf ../backup/*
    fi
    cd ../..

    cd $ROOT

    rm -rf android-npm/react-native-reanimated-"${version_name[$index]}-${engine}".aar
    cp android/build/outputs/aar/*.aar android-npm/react-native-reanimated-"${version_name[$index]}-${engine}".aar
  done
done

yarn add react-native@0.65.1 --dev

mv android android-temp
mv android-npm android

yarn run type:generate

npm pack

mv android android-npm
mv android-temp android

rm -rf ./lib

echo "Done!"