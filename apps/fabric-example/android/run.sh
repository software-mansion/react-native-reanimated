rm -rf /Users/piaskowyk/projects/react-native-reanimated/packages/react-native-reanimated/android/build
rm -rf /Users/piaskowyk/projects/react-native-reanimated/packages/react-native-reanimated/android/.cxx
rm -rf /Users/piaskowyk/projects/react-native-reanimated/apps/fabric-example/android/build
rm -rf /Users/piaskowyk/projects/react-native-reanimated/apps/fabric-example/android/app/build
rm -rf /Users/piaskowyk/projects/react-native-reanimated/apps/fabric-example/android/app/.cxx
time ./gradlew :react-native-reanimated:buildCMakeDebug --profile --no-build-cache --no-configuration-cache