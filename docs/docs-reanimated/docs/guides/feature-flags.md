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

| Feature flag name                                                                                   |              Type               | Added in | Removed in |               Default value               |
| --------------------------------------------------------------------------------------------------- | :-----------------------------: | :------: | :--------: | :---------------------------------------: |
| [`DISABLE_COMMIT_PAUSING_MECHANISM`](#disable_commit_pausing_mechanism)                             | [static](#static-feature-flags) |  4.0.0   |  –   |                  `false`                  |
| [`ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`](#android_synchronously_update_ui_props)                   | [static](#static-feature-flags) |  4.0.0   |  –   |                  `false`                  |
| [`IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`](#ios_synchronously_update_ui_props)                           | [static](#static-feature-flags) |  4.2.0   |  –   |                  `false`                  |
| [`EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS`](#experimental_css_animations_for_svg_components) | [static](#static-feature-flags) |  4.1.0   |  –   | `true` for 4.4.0+ <br/> `false` otherwise |
| [`USE_SYNCHRONIZABLE_FOR_MUTABLES`](#use_synchronizable_for_mutables)                               | [static](#static-feature-flags) |  4.1.0   | 4.7.0 | `true` for 4.3.0+ <br/> `false` otherwise |
| [`USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`](#use_commit_hook_only_for_react_commits)                 | [static](#static-feature-flags) |  4.2.0   |  –   | `true` for 4.3.0+ <br/> `false` otherwise |
| [`ENABLE_SHARED_ELEMENT_TRANSITIONS`](#enable_shared_element_transitions)                           | [static](#static-feature-flags) |  4.2.0   |  –   |                  `false`                  |
| [`USE_LEGACY_LAYOUT_ANIMATIONS_PROXY`](#use_legacy_layout_animations_proxy)                         | [static](#static-feature-flags) |  4.7.0   |  –   |                  `false`                  |
| [`FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS`](#force_react_render_for_settled_animations)           | [static](#static-feature-flags) |  4.2.0   |  –   | `true` for 4.3.0+ <br/> `false` otherwise |
| [`USE_ANIMATION_BACKEND`](#use_animation_backend)                                                   | [static](#static-feature-flags) |  4.4.0   |  –   |                  `false`                  |
| [`IOS_CSS_CORE_ANIMATION`](#ios_css_core_animation-and-android_css_platform_transitions)            | [static](#static-feature-flags) |  4.4.0   |  –   |                  `false`                  |
| [`ANDROID_CSS_PLATFORM_TRANSITIONS`](#ios_css_core_animation-and-android_css_platform_transitions)  | [static](#static-feature-flags) |  4.6.0   |  –   |                  `false`                  |

:::info

Feature flags available in `react-native-worklets` are listed [on this page](https://docs.swmansion.com/react-native-worklets/docs/guides/feature-flags).

:::

## Description of available feature flags

### `DISABLE_COMMIT_PAUSING_MECHANISM`

When enabled, this feature flag is supposed to eliminate jittering of animated components like sticky header while scrolling. This feature flag is safe to enable only if `preventShadowTreeCommitExhaustion` feature flag from `react-native` (available since React Native 0.81) is also enabled – see instructions below. In all other cases it can lead to unresponsiveness of the app due to the starvation of React commits. For more details, see [PR #7852](https://github.com/software-mansion/react-native-reanimated/pull/7852).

:::note
We no longer recommend setting experimental React Native release level because it also enables other unrelated flags, for instance `fixTextClippingAndroid15useBoundsForWidth`, which supposedly causes incorrect text clipping on Android 15. Instead, you should enable only the `preventShadowTreeCommitExhaustion` feature flag according to the instructions below.
:::

Here's how you can enable `preventShadowTreeCommitExhaustion` feature flag from React Native.

First, please apply the following change in `ReactNativeFeatureFlagsDefaults.h`:

```diff
   bool preventShadowTreeCommitExhaustion() override {
-    return false;
+    return true;
   }
```

It is recommended to make a patch after applying this change to make it persistent using tools like [patch-package](https://www.npmjs.com/package/patch-package), [yarn patch](https://yarnpkg.com/cli/patch) or [pnpm patch](https://pnpm.io/cli/patch).

You also need to build React Native from source in order for this change to take effect.

For Android, please add the following lines in `android/settings.gradle` according to the instructions [here](https://reactnative.dev/contributing/how-to-build-from-source#update-your-project-to-build-from-source):

```gradle
includeBuild('../node_modules/react-native') {
    dependencySubstitution {
        substitute(module("com.facebook.react:react-android")).using(project(":packages:react-native:ReactAndroid"))
        substitute(module("com.facebook.react:react-native")).using(project(":packages:react-native:ReactAndroid"))
        substitute(module("com.facebook.react:hermes-android")).using(project(":packages:react-native:ReactAndroid:hermes-engine"))
        substitute(module("com.facebook.react:hermes-engine")).using(project(":packages:react-native:ReactAndroid:hermes-engine"))
    }
}
```

For iOS, add the following lines in `ios/Podfile` according to the instructions [here](https://reactnative.dev/blog/2026/02/11/react-native-0.84#precompiled-binaries-on-ios-by-default).

```rb
ENV['RCT_USE_PREBUILT_RNCORE'] = '0'
```

:::tip
Flickering/jittering while scrolling will be ultimately fixed by branching mechanism which was introduced in [this PR to React Native](https://github.com/facebook/react-native/pull/54835). Currently it's under testing and should be out in some future release of React Native.
:::

### `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`

When enabled, non-layout styles will be applied using the `synchronouslyUpdateViewOnUIThread` method (which doesn't involve layout recalculation) instead of the `ShadowTree::commit` method (which requires layout recalculation). In an artificial benchmark, it can lead to up to 4x increase of frames per second. Even though we don't expect such high speedups in the production apps, there should be a visible improvement in the smoothness of some animations.

Currently, the following styles can be updated using the fast path: `opacity`, `elevation`, `zIndex`, `backgroundColor` (excluding `PlatformColor` values, same for all color props), `tintColor`, `placeholderTextColor`, `shadowColor`, `borderColor` (all sides, including `borderBlockColor`, `borderBlockStartColor` and `borderBlockEndColor`), `borderRadius` (all sides), `outlineColor`, `outlineOffset`, `outlineWidth` and `transform` (all transforms). All remaining styles, if present, will be updated via `ShadowTree::commit`.

This feature flag works only on Android and has no effect on iOS. For more details, see the original [PR #7823](https://github.com/software-mansion/react-native-reanimated/pull/7823).

However, there are some unwanted side effects that one needs to take into account and properly compensate for:

1. The changes applied via `synchronouslyUpdateViewOnUIThread` are not respected by the touch gesture system of Fabric renderer which can lead to incorrect behavior, in particular if transforms are applied. For example, `Pressable` from `react-native` inside an `Animated.View` may fire `onPressIn` but silently drops `onPress` when pressed mid- or post-animation. We recommend using `Pressable`, `Touchable` or `GestureDetector` component from `react-native-gesture-handler` (which attaches to the underlying platform view rather than using `ShadowTree` to determine the component present at given point) rather than its original counterpart from `react-native`. This bug is tracked in [issue #10121](https://github.com/software-mansion/react-native-reanimated/issues/10121).

1. Changes applied via `synchronouslyUpdateViewOnUIThread` are not synchronized with changes applied by `ShadowTree::commit` which may lead to minor inconsistencies of animated styles or animated components in a single animation frame.

### `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`

When enabled, non-layout styles will be applied using the `[RCTSurfacePresenter schedulerDidSynchronouslyUpdateViewOnUIThread:props:]` method (which doesn't involve layout recalculation) instead of the `ShadowTree::commit` method (which requires layout recalculation), which may result in better performance of animations.

The set of supported styles is the same as for `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`, with the addition of `shadowOffset`, `shadowOpacity` and `shadowRadius`, which are iOS-only. For more details, see the original [PR #8367](https://github.com/software-mansion/react-native-reanimated/pull/8367).

The limitations and side effects described for `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` apply here as well.

### `EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS`

When enabled, CSS animations and transitions will also work for a limited set of props of several components from [`react-native-svg`](https://github.com/software-mansion/react-native-svg) library. Currently, `Circle`, `Ellipse`, `Line`, `Path` and `Rect` components are supported.

### `USE_SYNCHRONIZABLE_FOR_MUTABLES`

This feature flag was supposed to speedup shared value reads on the RN runtime by reducing the number of calls to `runOnUISync`. When enabled, mutables (which are the primitives behind shared values) used [Synchronizable](https://docs.swmansion.com/react-native-worklets/docs/memory/synchronizable) state to check if they should sync with the UI Runtime. For more details, see [PR #8080](https://github.com/software-mansion/react-native-reanimated/pull/8080).

The flag was removed in 4.6.0 – mutables now always use Synchronizable state.

### `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`

This feature flag is supposed to fix performance regressions of animations while scrolling. When enabled, `ReanimatedCommitHook` applies latest animated styles and props only for React commits, which means the logic will be skipped for other commits, including state updates.

### `ENABLE_SHARED_ELEMENT_TRANSITIONS`

When enabled, Shared Element Transitions are available to use. The feature is not yet production ready, and may have some limitations or bugs. For more details, see [PR #7466](https://github.com/software-mansion/react-native-reanimated/pull/7466).

This feature flag conflicts with [`USE_LEGACY_LAYOUT_ANIMATIONS_PROXY`](#use_legacy_layout_animations_proxy) and they cannot be enabled simultaneously, because the legacy layout animations proxy does not support Shared Element Transitions.

### `USE_LEGACY_LAYOUT_ANIMATIONS_PROXY`

When enabled, layout animations run on the legacy layout animations proxy instead of the current default implementation. This is a rollback flag: use it only when the default proxy causes a regression in your app. If it does, please report an issue.

This feature flag conflicts with [`ENABLE_SHARED_ELEMENT_TRANSITIONS`](#enable_shared_element_transitions) and they cannot be enabled simultaneously.

### `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS`

This feature flag enables a mechanism that periodically synchronizes animated style updates back to React by triggering a React render for animated components with accumulated animated styles and evicting them from the registry on the C++ side. It is supposed to improve performance by decreasing the number of `ShadowNode` clone operations in `ReanimatedCommitHook` for React commits. When enabled, it also alters the behavior when detaching animated styles from animated components—the animated styles are not reverted to the original styles. If your app depends on that previous behavior, set this flag to `false` in `reanimated.staticFeatureFlags` in your app's `package.json`.

This feature flag conflicts with [`USE_ANIMATION_BACKEND`](#use_animation_backend) and they cannot be enabled simultaneously. The animation backend keeps animated changes in sync with the React tree on its own, so the settled animations synchronization mechanism is unnecessary. Since `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` is enabled by default, so if you want to use the animation backend, you need to explicitly disable this flag in your app's `package.json`.

### `USE_ANIMATION_BACKEND`

When enabled, Reanimated will use the React Native's new Animation Backend for applying animated changes. The backend will now be responsible for keeping animation changes in sync with the current React tree. This is meant to help with long-term stability and unlock new performance optimizations.

This flag is experimental and defaults to `false`. To use it, you must run React Native 0.85.2 or newer with `useSharedAnimatedBackend` feature flag enabled (which is achieved by using React Native's Experimental release level in development).

This feature flag conflicts with [`FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS`](#force_react_render_for_settled_animations) and they cannot be enabled simultaneously. Since `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` is enabled by default, you need to explicitly disable it in your app's `package.json` when enabling `USE_ANIMATION_BACKEND`:

```json
{
  // ...
  "reanimated": {
    "staticFeatureFlags": {
      "USE_ANIMATION_BACKEND": true,
      "FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS": false
    }
  }
}
```

### `IOS_CSS_CORE_ANIMATION` and `ANDROID_CSS_PLATFORM_TRANSITIONS`

Both flags enable the same feature, running CSS transitions with the platform's own animation API instead of Reanimated's animation loop. The platform then drives every frame, so Reanimated no longer recomputes and commits the transitioned values on each of them. One flag per platform:

- `IOS_CSS_CORE_ANIMATION` enables it on iOS, where a transition runs as a Core Animation animation on the view's layer,
- `ANDROID_CSS_PLATFORM_TRANSITIONS` enables it on Android, where it runs as an `ObjectAnimator` writing the animated value directly to the platform view.

Both are experimental and default to `false`. CSS animations always run on the loop, regardless of these flags.

Routing is decided per property, so a single transition may run partly on the platform and partly on the loop. A property is routed only when:

- it is listed in the table below,
- the animated component has no CSS transition callbacks. `onCSSTransitionRun`, `onCSSTransitionStart`, `onCSSTransitionEnd` and `onCSSTransitionCancel` work as usual, but only the animation loop reports them, so a component using any of them keeps all of its properties there,
- on iOS, its timing function is `linear` or a cubic Bezier curve, since `CAMediaTimingFunction` cannot express `steps` or `linear` easing with stops. There is no such limitation on Android, where `TimeInterpolator` carries any curve that CSS transitions support.

#### Properties routed to the platform

| Property          |    iOS    |  Android  |
| ----------------- | :-------: | :-------: |
| `opacity`         |    ✅     |    ✅     |
| `backgroundColor` |    ✅     |    ❌     |
| `borderColor`     |    ✅     |    ❌     |
| `borderRadius`    |    ✅     |    ❌     |
| `borderWidth`     |    ✅     |    ❌     |
| `shadowColor`     |    ✅     |    ❌     |
| `shadowOffset`    |    ✅     |    ❌     |
| `shadowOpacity`   |    ✅     |    ❌     |
| `shadowRadius`    |    ✅     |    ❌     |

Properties that aren't routed keep running on the animation loop, which supports all of them. Android routes `opacity` for now, support for more properties will be added in the future. `shadowOffset`, `shadowOpacity` and `shadowRadius` are iOS-only styles in React Native.

:::warning
Known limitation on iOS. `backgroundColor`, `borderColor`, `borderWidth` and `borderRadius` are routed even when React Native draws them on separate layers rather than on the view's own one. The routed animation doesn't reach those layers, so the new value shows up at once instead of animating. React Native keeps the four properties on the view's own layer only when:

- the border has the same color, the same width and the solid style on every side,
- the radius is the same on every corner and circular rather than elliptical,
- the view either has no visible border or clips its children with `overflow: 'hidden'`.

All four share that layer, so this is easiest to hit with a combination of them. A view with a visible border and the default `overflow` doesn't animate its `backgroundColor` either, even though the transition changes nothing about the border. `opacity` and the `shadow*` properties aren't affected, React Native always keeps them on the view's own layer.
:::

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
2. Rebuild the native app

:::warning
Static feature flags are not supported in environments where Reanimated is prebuilt with the default configuration of flags, like for instance in [Expo Go](https://expo.dev/go) and [RNRepo](https://rnrepo.org/).

- It's not possible to modify static feature flags in Expo Go. Please consider using [Expo Prebuild](https://docs.expo.dev/workflow/continuous-native-generation/) instead.
- If your project uses RNRepo, you need to force building Reanimated and Worklets from source by adding `react-native-reanimated` and `react-native-worklets` to the deny list as described in [RNRepo's documentation](https://github.com/software-mansion/rnrepo/blob/main/TROUBLESHOOTING.md#deny-list-configuration).

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
