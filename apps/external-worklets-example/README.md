# React Native Reanimated example app with Fabric

## Installing & running application

Before running application you need to install all dependencies. To do that:

- In project's root directory run `yarn install`
- In ExternalWorkletsExample directory run `yarn install`

### Android

To run this application on Android you need to have Java 17 active on your computer. You can check which version you are using by running `javac --version`. You can change it by changing `JAVA_HOME` environment variable or in Android Studio settings.

Then you can run this application by `yarn android` or from Android Studio.

### iOS

To run on iOS first go to `ExternalWorkletsExample/ios` and run `pod install`. This will install pods for Fabric architecture.

Then in `ExternalWorkletsExample` run `yarn ios` or run application from Xcode.
