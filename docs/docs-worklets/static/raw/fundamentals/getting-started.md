# Getting started

## What is React Native Worklets?

React Native Worklets is a library that allows you to run JavaScript code in parallel on multiple threads and runtimes.

While the library is in transitional period where we hone the API, all its features are functionally stable and ready to use in production.

## Prerequisites

> **Info**
>
> Worklets library isn't tested on the Legacy Architecture (Paper). We highly recommend migrating to the [New Architecture (Fabric)](https://reactnative.dev/architecture/landing-page) prior to using Worklets.

## Installation

### Step 1: Install the package

Install `react-native-worklets` package from npm:

```bash
npm install react-native-worklets
```

```bash
yarn add react-native-worklets
```

### Step 2: Rebuild native dependencies

Run prebuild to update the native code in the `ios` and `android` directories.

```bash
npx expo prebuild
```

```bash
yarn expo prebuild
```

And that's it! Worklets is now configured in your Expo project.

### React Native Community CLI

When using [React Native Community CLI](https://github.com/react-native-community/cli), you also need to manually add the `react-native-worklets/plugin` plugin to your `babel.config.js`.

```js {7}
module.exports = {
  presets: [
    ... // don't add it here :)
  ],
  plugins: [
    ...
    'react-native-worklets/plugin',
  ],
};
```

Worklets Babel plugin comes with several options, you can explore what they are and how to use them in the [Options for Worklets Babel Plugin](/docs/worklets-babel-plugin/plugin-options) section.

Why do I need this?

In short, the Worklets babel plugin automatically converts special JavaScript functions (called [worklets](/docs/fundamentals/glossary#worklet)) to allow them to be passed and run on the [Worklet Runtimes](/docs/fundamentals/runtimeKinds#worklet-runtime)

Since [Expo SDK 54](https://expo.dev/changelog/sdk-54-beta#notable-breaking-changes), the Expo starter template includes the Worklets babel plugin by default.

To learn more about the plugin head onto to [Worklets babel plugin](/docs/worklets-babel-plugin/about) section.

#### Clear Metro bundler cache (recommended)

```bash
npm start -- --reset-cache
```

```bash
yarn start --reset-cache
```

#### Android

No additional steps are necessary.

#### iOS

While developing for iOS, make sure to install [pods](https://cocoapods.org/) first before running the app:

```bash
cd ios && pod install && cd ..
```
