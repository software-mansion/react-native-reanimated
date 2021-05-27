---
id: installation
title: Installation
sidebar_label: Installation
---

Reanimated 2 is primarily built in C++ using [Turbo Modules](https://github.com/react-native-community/discussions-and-proposals/issues/40) infrastructure which is not yet completely deployed in React Native (specifically on Android).
Because of that the installation of new Reanimated requires additional steps apart from just adding a dependency to `package.json` .

As a consequence of the above the minimum supported version of React Native is [v0.62](https://github.com/facebook/react-native/releases/tag/v0.62.0).
Before you continue with the installation, make sure that you are running the supported version of React Native.

Please follow the below instructions for Android and iOS.

## I just want to try new Reanimated...

We realize the project setup is very complex and you may not want to add that to your existing app rightaway.
If you just want to play with Reanimated 2, we made a clean repo that has all the steps configured so that you can pull it from github and give the new version a shot.

[Visit the Playground repo here](https://github.com/software-mansion-labs/reanimated-2-playground) or copy the command below to do a git clone:

```bash
> git clone git@github.com:software-mansion-labs/reanimated-2-playground.git
```

Continue with the instruction below if you'd like to install Reanimated v2 on an existing or new React Native project.

## Installing the package

:::caution

Please note that Reanimated 2 doesn't support remote debugging, only Flipper can be used for debugging.

:::

First step is to install `react-native-reanimated` alpha as a dependency in your project:

```bash
> yarn add react-native-reanimated@next
```

### Reanimated 2 in Expo

To use experimental support of Reanimated 2 in the Expo managed apps follow [their installation instructions](https://docs.expo.io/versions/latest/sdk/reanimated/).

### Using master branch builds

To use Reanimated 2 built from the master branch:

- go to the ["Build npm package" workflow in Reanimated repository](https://github.com/software-mansion/react-native-reanimated/actions?query=workflow%3A%22Build+npm+package%22)
- select latest build and download `react-native-reanimated-2.0.0-alpha.tgz` artifact
- run `tar zxvf react-native-reanimated-2.0.0-alpha.tgz.zip` to unpack zip (or unpack it manually)
- run `yarn add file:react-native-reanimated-2.0.0-*.tgz` to install the package
- run `cd android && ./gradlew clean`

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

:::info

In previous releases, we required an additional step which is turning on Turbo Modules.
If you are upgrading from alpha.{ <=3 } please remove the following lines:

```Java
static {
   ReactFeatureFlags.useTurboModules = true;
 }
```

from `MainActivity.java`.

:::

You can refer [to this diff](https://github.com/software-mansion-labs/reanimated-2-playground/pull/8/commits/71642dbe7bd96eb41df5b9f59d661ab15f6fc3f8) that presents the set of the above changes made to a fresh react native project in our [Playground repo](https://github.com/software-mansion-labs/reanimated-2-playground).

### Proguard

If you're using Proguard, make sure to add rule preventing it from optimizing Turbomodule classes:

```
-keep class com.facebook.react.turbomodule.** { *; }
```

## iOS

Run `pod install` in the `ios/` directory.

:::info

In previous releases, the installation process was manual and required turning turbo modules on. Some libraries break when turbo modules are enabled so we decided to change our approach and we no longer
use the standard way for registering a turbo module. It let us simplify the installation process and as a result, you can safely
undo all installation steps from the [previous instruction](https://github.com/software-mansion/react-native-reanimated/blob/2.0.0-alpha.4/docs/docs/installation.md#ios).

:::

:::tip

If you want to turn off autoinstall on iOS please add the following compilation flag:
`DONT_AUTOINSTALL_REANIMATED`.
It can be done by pasting:

```js
post_install do |installer|
   installer.pods_project.targets.each do |target|
       target.build_configurations.each do |config|
           config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '-DDONT_AUTOINSTALL_REANIMATED'
       end
   end
end
```

to your `Podfile`. Don't forget to run `pod install` after doing that.

:::
