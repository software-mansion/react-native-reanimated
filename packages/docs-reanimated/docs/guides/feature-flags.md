---
id: feature-flags
title: Feature flags
sidebar_label: Feature flags
---

Feature flags allow developers to opt-in for experimental changes. They serve as a tool for incremental rollout of new implementation without affecting the general stability of the library, allowing to gather feedback from early adopters. There are two types of feature flags: static and dynamic. By default, all feature flags are disabled and they can be enabled individually.

:::info

Feature flags are available since Reanimated 4.

:::

## Summary of available feature flags

| Feature flag name                                                                           |               Type                | Added in | Removed in | Default value |
| ------------------------------------------------------------------------------------------- | :-------------------------------: | :------: | :--------: | :-----------: |
| [`DISABLE_COMMIT_PAUSING_MECHANISM`](#disable_commit_pausing_mechanism)                     |  [static](#static-feature-flags)  |  4.0.0   |  &ndash;   |    `false`    |
| [`ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`](#android_synchronously_update_ui_props)           |  [static](#static-feature-flags)  |  4.0.0   |  &ndash;   |    `false`    |
| [`UNSTABLE_CSS_ANIMATIONS_FOR_SVG_COMPONENTS`](#unstable_css_animations_for_svg_components) |  [static](#static-feature-flags)  | nightly  |  &ndash;   |    `false`    |
| [`IOS_DYNAMIC_FRAMERATE_ENABLED`](#ios_dynamic_framerate_enabled)                           |  [static](#static-feature-flags)  | nightly  |  &ndash;   |    `false`    |
| [`EXPERIMENTAL_MUTABLE_OPTIMIZATION`](#experimental_mutable_optimization)                   | [dynamic](#dynamic-feature-flags) | nightly  |  &ndash;   |    `false`    |

:::info

Feature flags available in `react-native-worklets` are listed [on this page](https://docs.swmansion.com/react-native-worklets/docs/guides/feature-flags).

:::

## Description of available feature flags

### `DISABLE_COMMIT_PAUSING_MECHANISM`

When enabled, this feature flag is supposed to eliminate jittering of animated components like sticky header while scrolling. This feature flag is safe to enable only if `preventShadowTreeCommitExhaustion` feature flag from `react-native` (available since React Native 0.81) is also enabled. In all other cases it can lead to the app being unresponsive due to the starvation of React commits. For more details, see [PR #7852](https://github.com/software-mansion/react-native-reanimated/pull/7852).

### `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`

When enabled, non-layout styles of animated components will be applied using the `synchronouslyUpdateViewOnUIThread` method instead of than `ShadowTree::commit` method (which requires layout recalculation). In a benchmark, it can lead to up to 4x increase of frames per second. However, there are some side effects:

1. The changes applied via `synchronouslyUpdateViewOnUIThread` are not respected by the touch gesture system of Fabric renderer which can lead to incorrect behavior, in particular if transforms are applied. In that case, it's advisable to use `Pressable` component from `react-native-gesture-handler` (which attaches to the underlying platform view rather than using `ShadowTree` to determine the component present at given point) rather than its original counterpart from `react-native`.

2. The changes are applied via `synchronouslyUpdateViewOnUIThread` are not synchronized with changes applied by `ShadowTree::commit` which may lead to minor inconsistencies of animated styles or animated components in a single animation frame.

Currently, only the following styles can be updated using the fast path: `opacity`, `elevation`, `zIndex`, `backgroundColor`, `tintColor`, `borderRadius` (all sides), `borderColor` (all sides) and `transform` (all transforms). All remaining styles, if present, will be updated via `ShadowTree::commit`.

This feature flag works only on Android and has no effect on iOS. For more details, see [PR #7823](https://github.com/software-mansion/react-native-reanimated/pull/7823).

### `UNSTABLE_CSS_ANIMATIONS_FOR_SVG_COMPONENTS`

When enabled, CSS animations and transitions will also work for selected props of selected components from [`react-native-svg`](https://github.com/software-mansion/react-native-svg) library. Currently, `Circle`, `Ellipse`, `Line`, `Path` and `Rect` components are supported.

### `IOS_DYNAMIC_FRAMERATE_ENABLED`

This feature flags is supposed to improve the visual perception of computationally expensive animations, e.g. when multiple components are animated at the same time. When enabled, the frame rate will be automatically adjusted. For instance, if the device fails to run animations in 120 fps, which often results in frame drops, the mechanism will fallback to stable 60 fps. For more details, see [PR #7624](https://github.com/software-mansion/react-native-reanimated/pull/7624).

### `EXPERIMENTAL_MUTABLE_OPTIMIZATION`

This feature flag is supposed to speedup shared value reads on the RN runtime by reducing the number of calls to `executeOnUIRuntimeSync`. When enabled, mutables (which are the foundation of shared values) use `Synchronizable` instead of `Shareable` to store current value of the mutable. For more details, see [PR #8080](https://github.com/software-mansion/react-native-reanimated/pull/8080).

## Static feature flags

Static flags are intended to be resolved during code compilation and cannot be changed during application runtime. To enable a static feature flag, you need to:

1. Add the following lines to `package.json` of your app

```json
{
  // ...
  "reanimated": {
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
import { setDynamicFeatureFlag } from 'react-native-reanimated';

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

- All feature flags are supposed to be disabled by default, allowing users to opt-in for the experimental behavior.
- Both static and dynamic feature flags should follow upper snake case, i.e. `EXAMPLE_FEATURE_FLAG`.
- The name of the feature flag should not contain the expression `FEATURE_FLAG` itself.
- It is recommended to explicitly use `ENABLE_` or `DISABLE_` prefix for feature flags that enable or disable certain parts of the code for the sake of clarity.
- Once the experimental behavior becomes the default, the feature flag should be removed from the codebase.
