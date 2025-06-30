# Bundle mode

## Setup

### General

To use `react-native-worklets`'s bundle mode feature, you need to make the following changes in your repository:

1. **Modify your Babel configuration**. In your `babel.config.js` file, add the following:
   ```javascript
   module.exports = {
     plugins: [
       [
         'react-native-worklets/plugin',
         {
           bundleMode: true,
         },
       ],
       // Your other plugins...
     ],
   };
   ```
2. **Modify your Metro configuration**. In your `metro.config.js` file, apply the config required for the bundle mode. For example:

   ```javascript
   const {
     getDefaultConfig,
     mergeConfig,
   } = require('@react-native/metro-config');
   const {
     bundleModeMetroConfig,
   } = require('react-native-worklets/bundleMode');

   const config = {
     // Your config
   };

   module.exports = mergeConfig(
     getDefaultConfig(__dirname),
     bundleModeMetroConfig,
     config
   );
   ```

3. Patch `@react-native-community/cli` with the [diff](../../.yarn/patches/@react-native-community-cli-plugin-npm-0.80.0-4137b3f35c.patch).
4. Patch `metro` with the [diff](../../.yarn/patches/metro-npm-0.82.4-2c6a795208.patch).
5. Patch `metro-runtime` with the [diff](../../.yarn/patches/metro-runtime-npm-0.82.4-32e8f779f8.patch).
6. Patch `react-native` with the [diff](../../.yarn/patches/react-native-npm-0.80.0-dababd395b.patch).

### iOS

1. **Modify your Podfile**. In your `ios/Podfile`, add the following:

```ruby
# top level
ENV['WORKLETS_BUNDLE_MODE'] = '1'
```

2. Make sure to reinstall your pods.

### Android

1. Enable building [React Native from source](https://reactnative.dev/contributing/how-to-build-from-source#android).
2. **Modify your `gradle.properties`**. In your `android/gradle.properties`, add the following:
   ```groovy
   workletsBundleMode=true
   ```
