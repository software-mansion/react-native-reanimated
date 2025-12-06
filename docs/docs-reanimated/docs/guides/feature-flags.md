---
id: feature-flags
title: Feature flags
sidebar_label: Feature flags
---

Feature flags allow developers to opt-in for experimental changes or opt-out from recent changes that have already been made default. Feature flags serve as a tool for incremental rollout of new implementation without affecting the general stability of the library, allowing to gather feedback from early adopters. There are two types of feature flags: static and dynamic.

:::info

Feature flags are available since Reanimated 4.

:::

## Summary of available feature flags

| Feature flag name                                                                                   |              Type               | Added in | Removed in | Default value |
| --------------------------------------------------------------------------------------------------- | :-----------------------------: | :------: | :--------: | :-----------: |
| [`DISABLE_COMMIT_PAUSING_MECHANISM`](#disable_commit_pausing_mechanism)                             | [static](#static-feature-flags) |  4.0.0   |  &ndash;   |    `false`    |
| [`ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`](#android_synchronously_update_ui_props)                   | [static](#static-feature-flags) |  4.0.0   |  &ndash;   |    `false`    |
| [`IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`](#ios_synchronously_update_ui_props)                           | [static](#static-feature-flags) |  4.2.0   |  &ndash;   |    `false`    |
| [`EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS`](#experimental_css_animations_for_svg_components) | [static](#static-feature-flags) |  4.1.0   |  &ndash;   |    `false`    |
| [`USE_SYNCHRONIZABLE_FOR_MUTABLES`](#use_synchronizable_for_mutables)                               | [static](#static-feature-flags) |  4.1.0   |  &ndash;   |    `false`    |
| [`USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`](#use_commit_hook_only_for_react_commits)                 | [static](#static-feature-flags) |  4.2.0   |  &ndash;   |    `false`    |
| [`ENABLE_SHARED_ELEMENT_TRANSITIONS`](#enable_shared_element_transitions)                           | [static](#static-feature-flags) |  4.2.0   |  &ndash;   |    `false`    |
| [`FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS`](#force_react_render_for_settled_animations)           | [static](#static-feature-flags) |  4.2.0   |  &ndash;   |    `false`    |

:::info

Feature flags available in `react-native-worklets` are listed [on this page](https://docs.swmansion.com/react-native-worklets/docs/guides/feature-flags).

:::

## Description of available feature flags

### `DISABLE_COMMIT_PAUSING_MECHANISM`

When enabled, this feature flag is supposed to eliminate jittering of animated components like sticky header while scrolling. This feature flag is safe to enable only if `preventShadowTreeCommitExhaustion` feature flag from `react-native` (available since React Native 0.81) is also enabled – see instructions below. In all other cases it can lead to unresponsiveness of the app due to the starvation of React commits. For more details, see [PR #7852](https://github.com/software-mansion/react-native-reanimated/pull/7852).

In React Native 0.81, `preventShadowTreeCommitExhaustion` feature flag can be enabled by setting experimental release level. If you're using Expo, you can enable it using [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/):

```json
{
  "expo": {
    // ...
    "plugins": [
      // ...
      // highlight-start
      [
        "expo-build-properties",
        {
          "android": {
            "reactNativeReleaseLevel": "experimental"
          },
          "ios": {
            "reactNativeReleaseLevel": "experimental"
          }
        }
      ]
      // highlight-end
    ]
  }
}
```

It will add the following lines in `gradle.properties` (Android) and `Info.plist` (iOS):

```gradle
reactNativeReleaseLevel=experimental
```

```
<key>ReactNativeReleaseLevel</key>
<string>experimental</string>
```

If you're not using Expo, in order to enable experimental release level on Android, you need to add the following lines in `MainApplication.kt` of your app:

```kt
package com.helloworld

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
// highlight-next-line
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
// highlight-next-line
import com.facebook.react.common.ReleaseLevel

class MainApplication : Application(), ReactApplication {
  // ...

  override fun onCreate() {
    super.onCreate()
    // highlight-next-line
    DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.EXPERIMENTAL
    loadReactNative(this)
  }
}
```

For iOS, you need edit the following line in `AppDelegate.swift` of your app:

```swift
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  // ...

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    // highlight-next-line
    let factory = RCTReactNativeFactory(delegate: delegate, releaseLevel: RCTReleaseLevel.Experimental)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    // ...
  }
}
```

### `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`

When enabled, non-layout styles will be applied using the `synchronouslyUpdateViewOnUIThread` method (which doesn't involve layout recalculation) instead of than `ShadowTree::commit` method (which requires layout recalculation). In an artificial benchmark, it can lead to up to 4x increase of frames per second. Even though we don't expect such high speedups in the production apps, there should be a visible improvements in the smoothness of some animations. However, there are some unwanted side effects that one needs to take into account and properly compensate for:

1. The changes applied via `synchronouslyUpdateViewOnUIThread` are not respected by the touch gesture system of Fabric renderer which can lead to incorrect behavior, in particular if transforms are applied. In that case, it's advisable to use `Pressable` component from `react-native-gesture-handler` (which attaches to the underlying platform view rather than using `ShadowTree` to determine the component present at given point) rather than its original counterpart from `react-native`.

2. The changes are applied via `synchronouslyUpdateViewOnUIThread` are not synchronized with changes applied by `ShadowTree::commit` which may lead to minor inconsistencies of animated styles or animated components in a single animation frame.

Currently, only the following styles can be updated using the fast path: `opacity`, `elevation`, `zIndex`, `backgroundColor` (excluding `PlatformColor`), `tintColor` (excluding `PlatformColor`), `borderColor` (all sides, excluding `PlatformColor`), `borderRadius` (all sides) and `transform` (all transforms). All remaining styles, if present, will be updated via `ShadowTree::commit`.

This feature flag works only on Android and has no effect on iOS. For more details, see [PR #7823](https://github.com/software-mansion/react-native-reanimated/pull/7823).

### `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`

When enabled, non-layout styles will be applied using the `[RCTSurfacePresenter schedulerDidSynchronouslyUpdateViewOnUIThread:props:]` method (which doesn't involve layout recalculation) instead of than `ShadowTree::commit` method (which requires layout recalculation). Limitations and unwanted side effects are the same as for `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`. For more details, see [PR #8367](https://github.com/software-mansion/react-native-reanimated/pull/8367).

### `EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS`

When enabled, CSS animations and transitions will also work for a limited set of props of several components from [`react-native-svg`](https://github.com/software-mansion/react-native-svg) library. Currently, `Circle`, `Ellipse`, `Line`, `Path` and `Rect` components are supported.

### `USE_SYNCHRONIZABLE_FOR_MUTABLES`

This feature flag is supposed to speedup shared value reads on the RN runtime by reducing the number of calls to `executeOnUIRuntimeSync`. When enabled, mutables (which are the primitives behind shared values) use [Synchronizable](https://docs.swmansion.com/react-native-worklets/docs/memory/synchronizable) state to check if they should sync with the UI Runtime. For more details, see [PR #8080](https://github.com/software-mansion/react-native-reanimated/pull/8080).

### `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`

This feature flag is supposed to fix performance regressions of animations while scrolling. When enabled, `ReanimatedCommitHook` applies latest animated styles and props only for React commits, which means the logic will be skipped for other commits, including state updates.

### `ENABLE_SHARED_ELEMENT_TRANSITIONS`

When enabled, Shared Element Transitions are available to use, also the synchronous prop update flags are disabled. The feature is not yet production ready, and may have some limitations or bugs. For more details, see [PR #7466](https://github.com/software-mansion/react-native-reanimated/pull/7466).

### `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS`

This feature flag enables a mechanism that periodically synchronizes animated style updates back to React by triggering a React render for animated components with accumulated animated styles and evicting them from the registry on the C++ side. It is supposed to improve performance by decreasing the number of `ShadowNode` clone operations in `ReanimatedCommitHook` for React commits. However, for the time being, it also alters the behavior when detaching animated styles from animated components – the animated styles won't be reverted to the original styles. This can cause unwanted side effects in your app's behavior, so please use this feature flag with caution, particularly if some parts of your app rely on detaching animated styles.

## Static feature flags

Static flags are intended to be resolved during code compilation and cannot be changed during application runtime. To enable a static feature flag, you need to:

1. Add the following lines to `package.json` of your app

```json
{
  // ...
  "reanimated": {
    "staticFeatureFlags": {
      "EXAMPLE_STATIC_FLAG": true
    }
  }
}
```

2. Run `pod install` (iOS only)
3. Rebuild the native app

:::warning
Static feature flags are not supported in environments where Reanimated is prebuilt with the default configuration of flags, like for instance in [Expo Go](https://expo.dev/go) and [RNRepo](https://rnrepo.org/).

- It's not possible to modify static feature flags in Expo Go. Please consider using [Expo Prebuild](https://docs.expo.dev/workflow/continuous-native-generation/) instead.
- If your project uses RNRepo, you need to force building Reanimated from source by adding it to the deny list as described in [RNRepo's documentation](https://github.com/software-mansion/rnrepo/blob/main/TROUBLESHOOTING.md#deny-list-configuration).

:::

To read a static feature flag value in JavaScript, you can use `getStaticFeatureFlag` function.

## Dynamic feature flags

Dynamic flags can be modified during runtime and their values can change at any moment of app lifetime. To enable or disable a dynamic feature flag, you need to call `setDynamicFeatureFlag` function.

```tsx
import { setDynamicFeatureFlag } from 'react-native-reanimated';

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
