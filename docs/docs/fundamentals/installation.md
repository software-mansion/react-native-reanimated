---
id: installation
title: Installation
sidebar_label: Installation
---

Installing Reanimated requires a couple of additional steps compared to installing most of the popular react-naitve packages.
Specifically on Android the setup consist of adding additional code to the main application class.
The steps needed to get reanimated properly configured are listed in the below paragraphs.

## Installing the package

First step is to install `react-native-reanimated` alpha as a dependency in your project:

```bash
yarn add react-native-reanimated
```

## Babel plugin

Add Reanimated's babel plugin to your `babel.config.js`:

```js {5}
  module.exports = {
      ...
      plugins: [
          ...
          'react-native-reanimated/plugin',
      ],
  };
```

:::caution

Reanimated plugin has to be listed last.

:::

## Android

1. Turn on Hermes engine by editing `android/app/build.gradle`

```java {2}
project.ext.react = [
  enableHermes: true  // <- here | clean and rebuild if changing
]
```

2. Plug Reanimated in `MainApplication.java`

```java {1-2,12-15}
  import com.facebook.react.bridge.JSIModulePackage; // <- add
  import com.swmansion.reanimated.ReanimatedJSIModulePackage; // <- add
  ...
  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
  ...

      @Override
      protected String getJSMainModuleName() {
        return "index";
      }

      @Override
      protected JSIModulePackage getJSIModulePackage() {
        return new ReanimatedJSIModulePackage(); // <- add
      }
    };
  ...
```

You can refer [to this diff](https://github.com/software-mansion-labs/reanimated-2-playground/pull/8/commits/71642dbe7bd96eb41df5b9f59d661ab15f6fc3f8) that presents the set of the above changes made to a fresh react native project in our [Playground repo](https://github.com/software-mansion-labs/reanimated-2-playground).

### Proguard

If you're using Proguard, make sure to add rule preventing it from optimizing Turbomodule classes:

```
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
```

## iOS

As reanimated is setup to configure and install automatically, the only thing you have to do is to run `pod install` in the `ios/` directory. Note that the auto-installation setup works for the standard React Naitve apps, if you have problems setting it up with a custom setup (e.g. brownfield) please start a new issue where we can find a way to guide you through that process.

Reanimated 2 is primarily built in C++ using [Turbo Modules](https://github.com/react-native-community/discussions-and-proposals/issues/40) infrastructure which is not yet completely deployed in React Native (specifically on Android).
Because of that the installation of new Reanimated requires additional steps apart from just adding a dependency to `package.json` .

As a consequence of the above the minimum supported version of React Native is [v0.62](https://github.com/facebook/react-native/releases/tag/v0.62.0).
Before you continue with the installation, make sure that you are running the supported version of React Native.

Please follow the below instructions for Android and iOS.

## Sample React-Native project configured with Reanimated

If you have troubles configuring Reanimated in your project, or just want to try the library without the need of setting it up ion a fresh project we recommend checking our [Reanimated Playground](https://github.com/software-mansion-labs/reanimated-2-playground) repo, which is essentially a fresh React-Native app with Reanimated library installed and configured properly.
[Visit the Playground repo here] or copy the command below to do a git clone:
