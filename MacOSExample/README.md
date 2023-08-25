## Running the MacOSExample app

1. Clone the repository:

```
git clone https://github.com/software-mansion/react-native-reanimated
cd react-native-reanimated
```

2. Install node_modules in project root directory:

```
yarn
```

3. Install node_modules in `MacOSExample/` directory:

```
cd MacOSExample
yarn
```

4. Install Pods in `MacOSExample/ios/` directory:

```
cd ios
pod install
```

5. Install Pods in `MacOSExample/macos/` directory:

```
cd ../macos
pod install
```

6. Start Metro bundler in `MacOSExample/` directory

```
cd ..
yarn start
```

### Running on macOS

You can either open the workspace in Xcode and launch the app from there:

```
open macos/MacOSExample.xcworkspace
```

or build and run directly from the command line:

```
yarn react-native run-macos
```

### Troubleshooting

If you have trouble with building the app, try running

```
rm -rf Pods Podfile.lock build
```

in `macos/` directory.