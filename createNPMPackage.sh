#!/bin/bash
set -e
set -x

ROOT=$(pwd)

unset CI

versions=("0.70.0-rc.3" "0.69.4" "0.68.3" "0.67.4" "0.66.4")
version_name=("70" "69" "68" "67" "66")

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

    CLIENT_SIDE_BUILD="False" FOR_HERMES=${for_hermes} ./gradlew :assembleDebug --no-build-cache --rerun-tasks

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

    rm -rf android/react-native-reanimated-"${version_name[$index]}-${engine}".aar
    cp android/build/outputs/aar/*.aar android/react-native-reanimated-"${version_name[$index]}-${engine}".aar
  done
done

yarn add react-native@"${versions[0]}" --dev

cp -R android/build build_output
cd android && ./gradlew clean && cd ..
yarn run type:generate
npm pack

rm -rf ./lib
rm -rf ./android/rnVersionPatch/backup/*
touch ./android/rnVersionPatch/backup/.gitkeep

echo "Done!"
