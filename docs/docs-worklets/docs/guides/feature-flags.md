---
id: feature-flags
title: Feature flags
sidebar_label: Feature flags
---

Feature flags allow developers to opt-in for experimental changes or opt-out from recent changes that have already been made default. Feature flags serve as a tool for incremental rollout of new implementation without affecting the general stability of the library, allowing to gather feedback from early adopters. There are two types of feature flags: static and dynamic.

## Summary of available feature flags

| Feature flag name                                                  |              Type               | Added in | Removed in | Default value |
| ------------------------------------------------------------------ | :-----------------------------: | :------: | :--------: | :-----------: |
| [`BUNDLE_MODE_ENABLED`](#bundle_mode_enabled-)                     | [static](#static-feature-flags) |  0.8.0   |  &ndash;   |    `false`    |
| [`FETCH_PREVIEW_ENABLED`](#fetch_preview_enabled-)                 | [static](#static-feature-flags) |  0.8.0   |  &ndash;   |    `false`    |
| [`IOS_DYNAMIC_FRAMERATE_ENABLED`](#ios_dynamic_framerate_enabled-) | [static](#static-feature-flags) |  0.6.0   |  &ndash;   |    `true`     |

:::info

Feature flags available in `react-native-reanimated` are listed [on this page](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags).

:::

## Description of available feature flags

### `BUNDLE_MODE_ENABLED` <AvailableFrom version="0.8.0" />

This feature flag enables [the Bundle Mode](/docs/bundleMode/). Make sure to follow the rest of the [setup instructions](/docs/bundleMode/setup/) after enabling this flag.

### `FETCH_PREVIEW_ENABLED` <AvailableFrom version="0.8.0" />

This feature flag enables the [preview of fetch API on Worklet Runtimes](/docs/bundleMode/usage#running-network-requests-in-worklets) in the [Bundle Mode](/docs/bundleMode/). Make sure to follow the rest of the [setup instructions](/docs/bundleMode/setup/) after enabling this flag.
**This flag requires `BUNDLE_MODE_ENABLED` flag to be enabled as well.**

### `IOS_DYNAMIC_FRAMERATE_ENABLED` <AvailableFrom version="0.6.0" />

This feature flags is supposed to improve the visual perception and perceived smoothness of computationally expensive animations. When enabled, the frame rate will be automatically adjusted for current workload of the UI thread. For instance, if the device fails to run animations in 120 fps which would usually results in irregular frame drops, the mechanism will fallback to stable 60 fps. For more details, see [PR #7624](https://github.com/software-mansion/react-native-reanimated/pull/7624).

## Static feature flags

Static flags are intended to be resolved during code compilation and cannot be changed during application runtime. To enable a static feature flag, you need to:

1. Add the following lines to `package.json` of your app

```json
{
  // ...
  "worklets": {
    "staticFeatureFlags": {
      "EXAMPLE_STATIC_FLAG": true
    }
  }
}
```

2. Run `pod install` (iOS only)
3. Rebuild the native app

:::warning
Static feature flags are not supported in environments where Worklets is prebuilt with the default configuration of flags, like for instance in [Expo Go](https://expo.dev/go) and [RNRepo](https://rnrepo.org/).

- It's not possible to modify static feature flags in Expo Go. Please consider using [Expo Prebuild](https://docs.expo.dev/workflow/continuous-native-generation/) instead.
- If your project uses RNRepo, you need to force building Worklets from source by adding it to the deny list as described in [RNRepo's documentation](https://github.com/software-mansion/rnrepo/blob/main/TROUBLESHOOTING.md#deny-list-configuration).

:::

To read a static feature flag value in JavaScript, you can use `getStaticFeatureFlag` function.

## Dynamic feature flags

Dynamic flags can be modified during runtime and their values can change at any moment of app lifetime. To enable or disable a dynamic feature flag, you need to call `setDynamicFeatureFlag` function.

```tsx
import { setDynamicFeatureFlag } from 'react-native-worklets';

setDynamicFeatureFlag('EXAMPLE_DYNAMIC_FLAG', true);
```

To read a dynamic feature flag value in JavaScript, you can use `getDynamicFeatureFlag` function.

## Comparison of static and dynamic feature flags

|                                             | Static feature flags | Dynamic feature flags |
| ------------------------------------------- | :------------------: | :-------------------: |
| Value is known during app build             |          ✅          |          ❌           |
| Value may change during app lifetime        |          ❌          |          ✅           |
| Value change requires app rebuild           |          ✅          |          ❌           |
| Can be changed via public JavaScript API    |          ❌          |          ✅           |
| Can be changed via app's `package.json`     |          ✅          |          ❌           |
| Can be changed when using Expo Go or RNRepo |          ❌          |          ✅           |

## Remarks for contributors

- Feature flags should switch the implementation to the new experimental behavior only when enabled.
- Initially, the default value should be false, allowing users to opt-in for the experimental behavior when desired.
- When the experimental behavior is considered stable, the default value should be set to true, while still allowing users to opt-out if needed.
- After some period, the feature flag which is enabled by default should be removed from the codebase.
- Both static and dynamic feature flags should follow upper snake case, i.e. `EXAMPLE_FEATURE_FLAG`.
- The name of the feature flag should not contain the expression `FEATURE_FLAG` itself.
- It is recommended to explicitly use `ENABLE_` or `DISABLE_` prefix for feature flags that enable or disable certain parts of the code for the sake of clarity.
