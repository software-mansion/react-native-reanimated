---
id: installation
title: Installation
sidebar_label: Installation
---

Installing Reanimated requires a couple of additional steps compared to installing most of the popular react-native packages.
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

By default, Reanimated plugin generate source location using absolute path. You can configure to use relative path:

```js {5}
  module.exports = {
      ...
      plugins: [
          ...
          [
              'react-native-reanimated/plugin', {
                  relativeSourceLocation: true,
              },
          ]
      ],
  };
```

:::caution

Reanimated plugin has to be listed last.

:::

:::info

After adding the `react-native-reanimated/plugin` to your project you may encounter a false-positive "Reanimated 2 failed to create a worklet" error. In most cases, this can be fixed by cleaning the application's cache. Depending on your workflow or favourite package manager that could be done by:

- `yarn start --reset-cache`
- `npm start -- --reset-cache`
- `expo start -c`

or other.

:::

## Android

No additional steps are necessary.

### Proguard

If you're using Proguard, make sure to add rule preventing it from optimizing Turbomodule classes:

```
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
```

## iOS

As reanimated is setup to configure and install automatically, the only thing you have to do is to run `pod install` in the `ios/` directory. Note that the auto-installation setup works for the standard React Native apps, if you have problems setting it up with a custom setup (e.g. brownfield) please start a new issue where we can find a way to guide you through that process.

## Sample React-Native project configured with Reanimated

If you have troubles configuring Reanimated in your project, or just want to try the library without the need of setting it up ion a fresh project we recommend checking our [Reanimated Playground](https://github.com/software-mansion-labs/reanimated-2-playground) repo, which is essentially a fresh React-Native app with Reanimated library installed and configured properly.
[Visit the Playground repo here](https://github.com/software-mansion-labs/reanimated-2-playground) or copy the command below to do a git clone:

```
git clone https://github.com/software-mansion-labs/reanimated-2-playground.git
```
