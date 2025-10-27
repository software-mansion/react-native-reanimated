---
id: performance
title: Performance
sidebar_label: Performance
---

# Performance

This guide covers best practices and tips to achieve the best performance with Reanimated.

## Performance regressions on the New Architecture

After enabling the New Architecture in your app, you might notice some performance regressions of animations, especially when compared to the old architecture. This can also happen after upgrading to Expo SDK 53 (or newer) where the New Architecture is enabled by default.

We are actively working with React core team at Meta on identifying bottlenecks and improving the overall state of animations on the New Architecture. For now, please consider enabling the following optimizations in your app to mitigate the performance regressions.

### Flickering/jittering while scrolling

**Problem:** When scrolling a `FlatList` or `ScrollView`, you might notice flickering or jittering of animated components (e.g. sticky header) implemented using `useAnimatedScrollHandler` hook.

**Solution:** You need to upgrade to React Native 0.81 (or newer), set experimental release level in order to enable `preventShadowTreeCommitExhaustion` feature flag and enable [`DISABLE_COMMIT_PAUSING_MECHANISM`](./feature-flags#disable_commit_pausing_mechanism) static feature flag as described [here](./feature-flags#disable_commit_pausing_mechanism).

### Lower FPS while scrolling

**Problem:** Frames per seconds drops when there are many animated components on the screen during scrolling.

**Solution:** You need to upgrade to React Native 0.80 (or newer), upgrade to Reanimated 4.2.0 (or newer) and enable [`USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`](./feature-flags#use_commit_hook_only_for_react_commits) static feature flag as described [here](./feature-flags#use_commit_hook_only_for_react_commits). It is also recommended to enable `enableCppPropsIteratorSetter` feature flag as described [below](#low-fps).

### Low FPS when running multiple animations at once

**Problem:** When animating many components simultaneously (also across multiple screens) you might notice FPS regressions.

**Solution 1:** Enable static feature flags `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` (available from 4.0.0) and `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` (available from 4.2.0) as described [here](./feature-flags#android_synchronously_update_ui_props) for Android and [here](./feature-flags#ios_synchronously_update_ui_props) for iOS, respectively. This will enable a fast code path for applying updates of non-layout styles like `opacity` or `transform` via platform-specific mechanisms rather than cloning `ShadowNode` instances and calling `ShadowTree::commit` method.

Note that these flags affect the touch detection system for components with animated transforms so you might want to consider using `Pressable` from `react-native-gesture-handler` instead of the built-in one from `react-native`.

It is also recommended to animate non-layout styles (e.g. `transform`) rather than layout-affecting styles as described below.

**Solution 2:** Manually enable `enableCppPropsIteratorSetter` feature flag from `react-native` by patching the source files and building React Native from source.

### Animate non-layout properties

It's generally faster to animate non-layout properties (like `transform` or `opacity`) rather than layout-affecting properties (like `top`/`left`, `width`/`height`, `margin` or `padding`). That's because the latter group requires a layout recalculation on each animation frame which is generally slower

## Debug vs. release mode

TODO

## Use `debugOptimized` build variant on Android

TODO

## Enable 120 fps

TODO

Android – enabled by default

iOS – should be enabled out of the box in template. make sure that your `Info.plist` contains:

```xml
<key>CADisableMinimumFrameDurationOnPhone</key>
<true/>
```

## Don't animate more than 500 views

TODO

For heavy use cases, use `react-native-skia` instead.

## Avoid reading shared values on the JS thread

TODO

## Memoize gestures

TODO

If you're not using React Compiler, remember to memoize your gestures with `useMemo`, in particular inside `FlatList` items, so the gestures don't need to be reattached on every render.

## Animate `TextInput` instead of re-rendering `Text` component

TODO

`CounterExample`
