#!/bin/bash
set -e

ROOT=$(pwd)

# part I (prepare android-npm)

cd Example/android/
./gradlew assembleRelease
cd ../node_modules/react-native/ReactAndroid/build/react-ndk/all

for d in *
do
  echo "processing $d"
  mkdir -p  "${ROOT}/android/src/main/JNILibs/${d}"
  cp "${d}/libreanimated.so" "${ROOT}/android/src/main/JNILibs/${d}/."
done

cd "${ROOT}"
rm -r android/build/outputs/aar/*.aar

cd  Example/android/


 ./gradlew clean
 ./gradlew aR

# clean so


cd ../node_modules/react-native/ReactAndroid/build/react-ndk/all

rm -rf "${ROOT}/android/src/main/JNILibs/"

cd $ROOT

rm -f android-npm/react-native-reanimated.aar
cp android/build/outputs/aar/*.aar android-npm/react-native-reanimated.aar

# PART II (create package)


mv android android-temp
mv android-npm android

npm pack

mv android android-npm
mv android-temp android


echo "Done!"

# How to generate a keystore: https://coronalabs.com/blog/2014/08/26/tutorial-understanding-android-app-signing/


: "
This script is extremely slow right now, so it's better to do the following steps:
- build Example project
- copy so files to android/src/main/JNILibs
- click on react-native-reaniamted module in AS and then build->make module
- copy aar from android/build/outputs/aar/ to android-npm/react-native-reanimated.aar
- execute the second part of the script
"
