---
id: feature-flags
title: Feature flags
sidebar_label: Feature flags
---

Feature flags allow developers to opt-in for experimental changes or opt-out from recent changes that have already been made default. Feature flags serve as a tool for incremental rollout of new implementation without affecting the general stability of the library, allowing to gather feedback from early adopters. There are two types of feature flags: static and dynamic.

## Summary of available feature flags

| Feature flag name                                                         |               Type                | Added in | Removed in | Default value |
| ------------------------------------------------------------------------- | :-------------------------------: | :------: | :--------: | :-----------: |
| [`IOS_DYNAMIC_FRAMERATE_ENABLED`](#ios_dynamic_framerate_enabled)         |  [static](#static-feature-flags)  |  4.1.0   |  &ndash;   |    `true`     |
| [`EXPERIMENTAL_MUTABLE_OPTIMIZATION`](#experimental_mutable_optimization) | [dynamic](#dynamic-feature-flags) |  4.1.0   |  &ndash;   |    `false`    |

:::info

Feature flags available in `react-native-reanimated` are listed [on this page](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags).

:::

## Description of available feature flags

### `IOS_DYNAMIC_FRAMERATE_ENABLED`

This feature flags is supposed to improve the visual perception and perceived smoothness of computationally expensive animations. When enabled, the frame rate will be automatically adjusted for current workload of the UI thread. For instance, if the device fails to run animations in 120 fps which would usually results in irregular frame drops, the mechanism will fallback to stable 60 fps. For more details, see [PR #7624](https://github.com/software-mansion/react-native-reanimated/pull/7624).

### `EXPERIMENTAL_MUTABLE_OPTIMIZATION`

This feature flag is supposed to speedup shared value reads on the RN runtime by reducing the number of calls to `executeOnUIRuntimeSync`. When enabled, mutables (which are the primitives behind shared values) use `Synchronizable` state to check if they should sync with the UI Runtime. For more details, see [PR #8080](https://github.com/software-mansion/react-native-reanimated/pull/8080).

## Static feature flags

Static flags are intended to be resolved during code compilation and cannot be changed during application runtime. To enable a static feature flag, you need to:

1. Add the following lines to `package.json` of your app

```json
{
  // ...
  "worklets": {
    "staticFeatureFlags": {
      "EXAMPLE_STATIC_FLAG": false
    }
  }
}
```

2. Run `pod install` (iOS only)
3. Rebuild the native app

## Dynamic feature flags

Dynamic flags can be modified during runtime and their values can change at any moment of app lifetime. To enable or disable a dynamic feature flag, you need to call `setDynamicFeatureFlag` function.

```tsx
import { setDynamicFeatureFlag } from 'react-native-worklets';

setDynamicFeatureFlag('EXAMPLE_DYNAMIC_FLAG', true);
```

## Comparison of static and dynamic feature flags

|                                          | Static feature flags | Dynamic feature flags |
| ---------------------------------------- | :------------------: | :-------------------: |
| Value is known during app build          |          ✅          |          ❌           |
| Value may change during app lifetime     |          ❌          |          ✅           |
| Value change requires app rebuild        |          ✅          |          ❌           |
| Can be changed via public JavaScript API |          ❌          |          ✅           |
| Can be changed via app's `package.json`  |          ✅          |          ❌           |

## Remarks for contributors

- Feature flags should switch the implementation to the new experimental behavior only when enabled.
- Initially, the default value should be false, allowing users to opt-in for the experimental behavior when desired.
- When the experimental behavior is considered stable, the default value should be set to true, while still allowing users to opt-out if needed.
- After some period, the feature flag which is enabled by default should be removed from the codebase.
- Both static and dynamic feature flags should follow upper snake case, i.e. `EXAMPLE_FEATURE_FLAG`.
- The name of the feature flag should not contain the expression `FEATURE_FLAG` itself.
- It is recommended to explicitly use `ENABLE_` or `DISABLE_` prefix for feature flags that enable or disable certain parts of the code for the sake of clarity.
