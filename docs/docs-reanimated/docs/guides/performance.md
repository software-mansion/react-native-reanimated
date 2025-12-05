---
id: performance
title: Performance
sidebar_label: Performance
---

# Performance

This guide covers recommended practices and tips to achieve the best performance with Reanimated.

## Performance regressions on the New Architecture

After enabling the New Architecture in your app, you might notice some performance regressions of animations, especially when compared to the Legacy Architecture. This can also happen after upgrading to Expo SDK 53 (or newer) where the New Architecture is enabled by default.

We are actively working with the React core team at Meta on identifying bottlenecks and improving the overall state of animations on the New Architecture. For now, please consider enabling the following optimizations in your app to mitigate the performance regressions.

Please note that downgrading your Expo SDK version or using an older release of Reanimated is not a good solution in the long term. Reanimated 3 is no longer maintained and will not receive updates to support upcoming releases of React Native. Please upgrade to the latest version of Reanimated 4 in order to get bug fixes and other improvements.

### ⚠️ Flickering/jittering while scrolling

**Problem:** When scrolling a `FlatList` or `ScrollView`, you might notice flickering or jittering of animated components (e.g. sticky header) implemented using `useAnimatedScrollHandler` hook.

**Solution:** You need to upgrade to React Native 0.81 (or newer), set experimental release level in order to enable `preventShadowTreeCommitExhaustion` feature flag and enable [`DISABLE_COMMIT_PAUSING_MECHANISM`](/docs/guides/feature-flags#disable_commit_pausing_mechanism) static feature flag as described [here](/docs/guides/feature-flags#disable_commit_pausing_mechanism).

### ⚠️ Lower FPS while scrolling

**Problem:** FPS drops when there are many animated components on the screen during scrolling.

**Solution:** You need to upgrade to React Native 0.80 (or newer), upgrade to Reanimated 4.2.0 (or newer) and enable [`USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`](/docs/guides/feature-flags#use_commit_hook_only_for_react_commits) static feature flag as described [here](/docs/guides/feature-flags#use_commit_hook_only_for_react_commits).

You can also consider enabling `enableCppPropsIteratorSetter` feature flag as described [below](#️-low-fps-when-running-multiple-animations-at-once).

### ⚠️ Low FPS when running multiple animations at once

**Problem:** When animating many components simultaneously (also across multiple screens) you might notice FPS regressions.

**Solution 1:** Enable `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` (available from 4.0.0) and `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` (available from 4.2.0) static feature flags as described [here](/docs/guides/feature-flags#android_synchronously_update_ui_props) for Android and [here](/docs/guides/feature-flags#ios_synchronously_update_ui_props) for iOS, respectively. This will enable a fast code path for applying updates of non-layout styles like `opacity` or `transform` via platform-specific mechanisms rather than cloning `ShadowNode` instances and calling `ShadowTree::commit` method.

Note that these flags affect the touch detection system for components with animated transforms so you might want to consider using `Pressable` from `react-native-gesture-handler` instead of the built-in one from `react-native`.

It is also recommended to animate non-layout styles (e.g. `transform`) rather than layout-affecting styles as described [below](#-prefer-animating-non-layout-properties).

**Solution 2:** Manually enable `enableCppPropsIteratorSetter` feature flag from `react-native` by patching the source files and building React Native from source. Note that this feature flag is experimental and may produce unexpected results.

### ⚠️ Blink of incorrect layout of FlashList

**Problem:** When `FlashList` component from `@shopify/flash-list` is mounted while there are some animations running, the item components might be positioned incorrectly for a split second. Unfortunately, the root cause of the issue is located in React Native itself. We reported a [GitHub issue](https://github.com/facebook/react-native/issues/52373) where you can track the progress.

### ℹ️ Debug vs. release mode

It is very likely that the performance regressions are noticeable only in the development build of your app. In the release mode, both Reanimated and React Native itself are built with compiler optimizations enabled, which results in much better performance when compared to the debug mode.

#### 💡 Use `debugOptimized` build variant on Android

For better development experience, you might also consider using `debugOptimized` build variant on Android (available from React Native 0.82) – more details [here](https://reactnative.dev/blog/2025/10/08/react-native-0.82#optimized-debug-build-type-for-android).

## What to avoid

### ❌ Avoid reading shared values on the JS thread

Reading shared values is allowed only from worklets running on the UI thread. You should avoid reading shared values in the React Native runtime on the JavaScript thread.

```js
const sv = useSharedValue(0);

useEffect(() => {
  console.log(sv.value); // ❌ reading shared value in the RN runtime (not recommended)
}, []);

const animatedStyle = useAnimatedStyle(() => {
  return { opacity: sv.value }; // ✅ this is okay
});
```

When you read the `sv.value` in the React Native runtime, the JS thread will get blocked until the value is fetched from the UI thread. In most cases it will be negligible, but if the UI thread is busy or you are reading a value multiple times, the wait time needed to synchronize both threads may significantly increase. For more details, check out [this article](https://andrei-calazans.com/posts/reanimated-blocking-js-thread/).

### ❌ Avoid animating too many components at once

Reanimated is perfectly capable of animating several dozens of components at once. However, if there's too many components to be animated simultaneously, performance can be affected. As a rule of thumb, you should animate no more than 100 components for low-end Android devices and no more than 500 components for iOS. For more complex animations, consider using Reanimated with `react-native-skia` instead of rendering individual React components.

## Other tips

### 💡 Enable 120 fps

In order to enable support for 120 fps on iOS, make sure that `CADisableMinimumFrameDurationOnPhone` flag is enabled in `Info.plist`. The flag is enabled by default in the app template starting from React Native 0.82.

```xml
<key>CADisableMinimumFrameDurationOnPhone</key>
<true/>
```

### 💡 Prefer animating non-layout properties

Animating non-layout properties (like `transform`, `opacity` or `backgroundColor`) is generally more performant than animating styles that affect layout (like `top`/`left`, `width`/`height`, `margin` or `padding`). That's because the latter group requires an additional step of layout recalculation on each animation frame.

Whenever possible, you should prefer using non-layout styles (e.g. `transform` with `translateX`/`translateY`) rather than their layout-affecting counterparts (i.e. `top`/`left`).

Additionally, non-layout properties can be updated using a fast path – more details [here](/docs/guides/feature-flags#android_synchronously_update_ui_props).

### 💡 Memoize frame callbacks

If you are using [`useFrameCallback`](/docs/advanced/useFrameCallback), you should wrap the frame callback worklet inside `useCallback` in order to memoize it. This way, the frame callback won't need to be recrated and thus registered on every render. If you are using React Compiler, the frame callback should be memoized automatically.

```tsx
useFrameCallback(
  useCallback(() => {
    'worklet';
  }, [...deps])
);
```

### 💡 Memoize gesture objects

If you are using [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/), you should wrap gesture objects like `Gesture.Tap()` or similar inside `useMemo` in order to memoize them. This way, the gestures won't need to be reattached on every render. This is particularly important for `FlatList` items where performance is key. If you are using React Compiler, the gesture objects should be memoized automatically.

```tsx
const pan = useMemo(
  () =>
    Gesture.Pan()
      .onStart(() => {})
      .onEnd(() => {}),
  [...deps]
);
```

### 💡 Use `Animated.Text` instead of re-rendering `Text` component

When implementing text animations (e.g. animated counters), don't use React state to periodically update the counter. Instead, store the number in a shared value and use an `Animated.Text` component with animated `text` prop using [`useAnimatedProps`](/docs/core/useAnimatedProps) or inline props in order to display the current value. For more details, see [Text animations](/docs/guides/text-animations) guide.
