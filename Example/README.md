## Running the Example app

1. Clone the repository:

```
git clone https://github.com/software-mansion/react-native-reanimated
cd react-native-reanimated
```

2. Install node_modules in project root directory:

```
yarn
```

3. Install node_modules in `Example/` directory:

```
cd Example
yarn
```

4. Install Pods in `Example/ios/` directory:

```
cd ios
pod install
```

5. Start Metro bundler in `Example/` directory

```
cd ..
yarn start
```

### Running on iOS

You can either open the workspace in Xcode and launch the app from there:

```
open ios/ReanimatedExample.xcworkspace
```

or build and run directly from the command line:

```
yarn react-native run-ios
```

**Important:** You will need to have an iOS device or simulator connected.

### Running on Android

You can either open the project with Android Studio and launch the app from there:

```
open -a "Android Studio" android/
```

or build and run directly from the command line:

```
yarn react-native run-android
```

**Note:** You can also pass `--active-arch-only` flag to build the app only for the current architecture to significantly shorten build time.

**Important:** You will need to have an Android device or emulator connected.
