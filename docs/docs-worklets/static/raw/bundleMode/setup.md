# Setup

## Package installation

Install `react-native-worklets` package with the `bundle-mode-preview` tag:

```bash
npm i react-native-worklets@bundle-mode-preview
```

```bash
yarn add react-native-worklets@bundle-mode-preview
```

## Configure Babel

To use `react-native-worklets`'s Bundle Mode feature, you need to make the following changes in your repository:

1. **Modify your Babel configuration**. [Worklets Babel Plugin](/docs/worklets-babel-plugin/about) needs to know that it has to prepare your code for the Bundle Mode. In your `babel.config.js` file, add the following:

   ```javascript {2-5,13}
   /** @type {import('react-native-worklets/plugin').PluginOptions} */
   const workletsPluginOptions = {
     bundleMode: true,
     strictGlobal: true, // optional, but recommended
   }

   module.exports = {
     presets: [
       ... // don't add it here :)
     ],
     plugins: [
       ...
       ['react-native-worklets/plugin', workletsPluginOptions],
     ],
   };
   ```

## Configure Metro

2. **Modify your Metro configuration**. Metro needs to be configured pre-load Bundle Mode entry points into your JavaScript bundle. In your `metro.config.js` file, apply the config required for the bundle mode. For example:

   ```javascript {6-8,16}
   const {
     getDefaultConfig,
     mergeConfig,
   } = require('@react-native/metro-config');

   const {
     bundleModeMetroConfig,
   } = require('react-native-worklets/bundleMode');

   const config = {
     // Your Metro config
   };

   module.exports = mergeConfig(
     getDefaultConfig(__dirname),
     bundleModeMetroConfig,
     config
   );
   ```

## Configure your app

For Worklets to know that it should run in Bundle Mode, you need to toggle on `WORKLETS_BUNDLE_MODE_ENABLED` static feature flag in your app's `package.json`. You can find instructions on how to enable it [here](/docs/guides/feature-flags).

## Enable seamless Metro bundling

*This step is optional but highly recommended.*

If you run the app after just executing the above steps, you will see an error "Failed to get the SHA-1 for ...":

This is due to fact that Bundle Mode isolates each worklet in a separate module (file) on the fly and the Metro bundler doesn't index these isolated modules in time.

To fix this issue you can do one of the following:

1. Reload the app and Metro a couple of times until Metro picks up all the new modules. You will have to do it each time. Not recommended.
2. Patch `metro` package for it to synchronously index new modules created by Bundle Mode. This is the recommended approach. **This patch does not require building React Native from source**. You can find patching instructions in the [Worklets repository](https://github.com/software-mansion/react-native-reanimated/tree/main/packages/react-native-worklets/bundleMode/patches).

This patch is a temporary workaround until necessary changes are merged into Metro.

## Enable fast refresh on Worklet Runtimes

*This step is optional but highly recommended.*

React Native's Fast Refresh (hot reload) feature doesn't apply to Worklet Runtimes out of the box. Therefore, when you change worklet's code you will see an error "\[Worklets] Unable to resolve worklet with hash ...".

This is due to fact that the Fast Refresh update wasn't sent to the Worklet Runtime and it doesn't know that new worklet with the given hash exists.

To fix this issue you can do one of two thing:

1. Reload the app on each worklet code change. This virtually defeats the purpose of Fast Refresh. Not recommended.
2. Patch `metro-runtime` package for it to send Fast Refresh updates to Worklet Runtimes. This is the recommended approach. **This patch does not require building React Native from source** You can find patching instructions in the [Worklets repository](https://github.com/software-mansion/react-native-reanimated/tree/main/packages/react-native-worklets/bundleMode/patches).

This patch is a temporary workaround until necessary changes are merged into Metro.

## Final steps

Make sure to clear your Metro bundler's cache to ensure that all the changes are applied correctly.

```bash
npm start -- --reset-cache
```

```bash
yarn start --reset-cache
```

And that's it! You can now happily enjoy the Bundle Mode! You can learn more about using the Bundle Mode [here](/docs/bundleMode/usage).

## Reference

To see how the setup looks in a real project, you can check out the [Bundle Mode Showcase App](https://github.com/software-mansion-labs/Bundle-Mode-showcase-app) repository.
