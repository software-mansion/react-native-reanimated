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

3. Patch `@react-native-community/cli` with the [diff](../../.yarn/patches/@react-native-community-cli-plugin-npm-0.80.0-rc.4-af2762c07e.patch).
4. Patch `react-native` with the [diff](../../.yarn/patches/react-native-npm-0.80.0-rc.4-ad01aea617.patch).

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

## Running

- When running the app, it will initially throw errors like `Unable to resolve module react-native-worklets/__generatedWorklets/...`. This is expected, because the bundle has not yet converged. When it happens, reload the app. On Android you might need to restart the app. After several reloads, the bundle will converge and the errors will be gone.
- In rare cases where the same error would reappear, re-run Metro bundler with the `--reset-cache` flag to enforce rebuilding the worklets bundle.
- Fast refresh will not work when you modify code in worklets. You need to reload the app in these cases.
- In production builds bundling is a compilation step - which means that the compilation will fail several times until the bundle converges. Keep restarting the build until it succeeds.
