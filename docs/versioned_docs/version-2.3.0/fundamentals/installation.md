---
id: installation
title: Installation
sidebar_label: Installation
---

Installing Reanimated requires a couple of additional steps compared to installing most of the popular React Native packages.
Specifically on Android the setup consist of adding additional code to the main application class.
The steps needed to get Reanimated properly configured are listed in the below paragraphs.

## Installing the package

First step is to install `react-native-reanimated` as a dependency in your project:

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

You can refer [to this diff](https://github.com/software-mansion-labs/reanimated-2-playground/pull/8/commits/71642dbe7bd96eb41df5b9f59d661ab15f6fc3f8) that presents the set of the above changes made to a fresh React Native project in our [Playground repo](https://github.com/software-mansion-labs/reanimated-2-playground).

### Proguard

If you're using Proguard, make sure to add rule preventing it from optimizing Turbomodule classes:

```
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
```

## iOS

As Reanimated is setup to configure and install automatically, the only thing you have to do is to run `pod install` in the `ios/` directory. Note that the auto-installation setup works for the standard React Native apps, if you have problems setting it up with a custom setup (e.g. brownfield) please start a new issue where we can find a way to guide you through that process.

## Sample React-Native project configured with Reanimated

If you are having trouble configuring Reanimated in your project, or just want to try the library without the need of setting it up on a fresh project we recommend checking our [Reanimated Playground](https://github.com/software-mansion-labs/reanimated-2-playground) repo, which is essentially a fresh React Native app with Reanimated library installed and configured properly.
[Visit the Playground repo here](https://github.com/software-mansion-labs/reanimated-2-playground) or copy the command below to do a git clone:

```
git clone https://github.com/software-mansion-labs/reanimated-2-playground.git
```
