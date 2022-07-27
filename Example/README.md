## Running the example

- clone the repository
- `yarn install` at main directory
- `cd Example/`
- `yarn install` again

### Running on iOS

- `yarn pod-install` - to install pods
- `yarn react-native run-ios` - to run the app

### Running on Android

- [install NDK in version 21.3.6528147 or higher](https://developer.android.com/studio/projects/install-ndk)
- `yarn react-native run-android` - to run the app

**Note:** Android compiles fairly long due to native dependencies. To shorten consecutive builds, load the project into android studio and run it from there. Same applies to iOS so you can use XCode for running the example.

**Important:** You will need to have an Android or iOS device or emulator connected.
