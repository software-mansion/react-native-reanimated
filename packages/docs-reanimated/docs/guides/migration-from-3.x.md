---
id: migration-from-3.x
title: Migrating from Reanimated 3.x to 4.x
sidebar_label: Migration from 3.x
---

## Breaking changes

On the API surface level, Reanimated 4.x introduces only some minor renames and other breaking changes between 3.x and 4.x as listed below. All the animation logic you've written in Reanimated v2 or v3 API works in 4.x with little to no changes. Animations based on shared values will work the same way as before, simultaneously and interchangeably with CSS animations and transitions. This means you can adopt CSS animations and transitions in your codebase incrementally at your own pace.

### New Architecture only

Reanimated 4.x supports only the [New Architecture](https://reactnative.dev/architecture/landing-page) and drops support for the Legacy Architecture along with the legacy renderer (commonly known as Paper) entirely. If your app still runs on the Legacy Architecture, please consider adopting the New Architecture or stay with latest 3.x release.

### Added dependency on `react-native-worklets`

In Reanimated 4, [worklets](/docs/fundamentals/glossary#worklet) implementation has been moved to a separate npm package named `react-native-worklets`. You need to install `react-native-worklets` package using your package manager and rebuild the native apps.

### Renamed `react-native-reanimated/plugin`

Change `'react-native-reanimated/plugin'` to `'react-native-worklets/plugin'` in `babel.config.js`.

### Changed the default behavior of `withSpring`

`withSpring` animation no longer uses `restDisplacementThreshold` and `restSpeedThreshold` parameters, they were replaced with a single `energyThreshold` parameter.

This parameter is relative to the animation, unlike absolute `restDisplacementThreshold` and `restSpeedThreshold`. This means that removing all usage of `restDisplacementThreshold` and `restSpeedThreshold` should be enough and you don't need to override `energyThreshold` in your codebase.

`duration` parameter was changed that so it's now the perceptual duration of the animation, not the actual time it takes to complete. The actual time to complete is 1.5 times the perceptual duration. If you were using the `duration` parameter and want to achieve the same effect as before, you need to divide the `duration` parameter by 1.5 in your codebase.

The default parameters of the animation changed as well. They proved to be of little use in real-world applications. If you depended on them, you can still import them with the following import statement:

```js
import { Reanimated3DefaultSpringConfig } from 'react-native-reanimated'; // For physics based defaults.
import { Reanimated3DefaultSpringConfigWithDuration } from 'react-native-reanimated'; // For duration based defaults.
```

You can explore the changes in the default parameters in [withSpring reference](/docs/animations/withSpring).

### Removed `useWorkletCallback`

`useWorkletCallback` was marked as deprecated in Reanimated 3 and has been removed in Reanimated 4.

To migrate from `useWorkletCallback`:

1. Add `'worklet';` directive inside the function
2. Add dependency array according to the rules of hooks

```jsx
// highlight-next-line
useCallback(() => {
  // highlight-next-line
  'worklet';
  // some code
  // highlight-next-line
}, [...dependencies]);
```

If you're using [gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet), you need to upgrade to version 5.1.8 or newer.

### Removed `addWhitelistedNativeProps` and `addWhitelistedUIProps`

Reanimated 4 removes the concept of native and UI props. `addWhitelistedNativeProps` and `addWhitelistedUIProps` are now no-ops, marked as deprecated and planned to be removed in a future release of Reanimated. You are safe to remove all usages of these functions across your codebase.

### Removed `combineTransition`

`combineTransition` was deprecated in Reanimated 3 and has been removed in Reanimated 4. You can achieve the same effect using the syntax below. For more details, check out [Entry/Exit Transition](/docs/layout-animations/layout-transitions/#entryexit-transition).

```js
EntryExitTransition.entering(entering).exiting(exiting);
```

### Removed support for `react-native-v8`

Reanimated 4 removes support for [react-native-v8](https://github.com/Kudo/react-native-v8) engine. We no longer actively support V8 and the project itself seems to be abandoned as there hasn't been any new commits since August 2024.

If you are affected by this change, please leave a comment under the [related PR](https://github.com/software-mansion/react-native-reanimated/pull/7650) and explain your motivation to use V8 engine with Reanimated. We might consider restoring support for V8 engine at some point in the future.

### Renamed `useScrollViewOffset` to `useScrollOffset`

In Reanimated 4, we renamed `useScrollViewOffset` to `useScrollOffset`. For the sake of backwards compatibility, we decided to keep `useScrollViewOffset` for now but it is marked as deprecated and planned to be removed in a future release of Reanimated. You need to update all `useScrollViewOffset` usages to `useScrollOffset`.

### Removed `useAnimatedGestureHandler`

`useAnimatedGestureHandler` was marked as deprecated in Reanimated 3 and has been removed in Reanimated 4. You need to refactor all its usages to the new `Gesture` API introduced in Gesture Handler 2 according to the steps described in [React Native Gesture Handler documentation](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-2).

### Removed `createAnimatedPropAdapter`

In Reanimated 4, the `adapters` parameter has been removed from `useAnimatedProps`. All properties that previously required adapters now should work directly.

#### Before

Using custom adapter for fill and stroke properties:

```jsx
import {
  createAnimatedPropAdapter,
  processColor,
} from 'react-native-reanimated';

const adapter = createAnimatedPropAdapter(
  (props) => {
    if (Object.keys(props).includes('fill')) {
      props.fill = { type: 0, payload: processColor(props.fill) };
    }
    if (Object.keys(props).includes('stroke')) {
      props.stroke = { type: 0, payload: processColor(props.stroke) };
    }
  },
  ['fill', 'stroke']
);

const animatedProps = useAnimatedProps(
  () => ({
    fill: 'yellow',
    stroke: 'rgb(255,0,0)',
  }),
  [],
  adapter
);
```

#### After

Properties work directly without adapter:

```jsx
const animatedProps = useAnimatedProps(() => ({
  fill: 'yellow',
  stroke: 'rgb(255,0,0)',
}));
```

## Integration with other libraries

All integrations with other third-party libraries such as [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/docs/) or [React Native Skia](https://shopify.github.io/react-native-skia/) work the same as on 3.x. However, Reanimated 4 no longer provides support for [React Native V8](https://github.com/Kudo/react-native-v8/issues).

## Migrating from 2.x

For the migration guide between 2.x and 3.x versions please consult [Migration from 2.x to 3.x](/docs/guides/migration-from-2.x.md).
