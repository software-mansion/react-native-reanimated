---
id: useAnimatedProps
title: useAnimatedProps
sidebar_label: useAnimatedProps
---

This hook is a counterpart of [`useAnimatedStyle`](api/useAnimatedStyle) hook, but works for a non-style view properties.
It allows for defining a set of native view properties that can be updated on the UI thread as a response to a Shared Value change.
Similarily to [`useAnimatedStyle`](api/useAnimatedStyle), this hook takes a single worklet (it is not necessary to add `worklet` directive here, because the method will be converted to worklet automatically).
The provided worklet is responsible for returning a object with view properties.

Only "native" properties of "native views" can be set via `useAnimatedProps`.
The most common usecase for this hook is when we want to animate properties of some third-party native component, since most of the properties for the core React Native components are a part of the styles anyways (at least the properties for which it makes sense to be animated).

In order to connect the `useAnimatedProps` hook result to a view, you need to pass it as `animatedProps` property to the `Animated` version of the component (e.g., `Animated.View`).
The `animatedProps` property is added when a native component is wrapped with `Animated.createAnimatedComponent`.

If the animated props worklet uses any shared values, it will be executed upon these values updates and the connected view will be updated.

In the example below we use [`react-native-svg`](https://github.com/react-native-community/react-native-svg) package and animate one of the native properties of SVG views:

## Example

```js {12-16}
import { StyleSheet } from 'react-native';
import {
  Animated,
  useSharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

function App() {
  const radius = useSharedValue(50);

  const animatedProps = useAnimatedProps(() => {
    // draw a circle
    const path = `
    M 100, 100
    m -${radius}, 0
    a ${radius},${radius} 0 1,0 ${radius * 2},0
    a ${radius},${radius} 0 1,0 ${-radius * 2},0
    `;
    return {
      d: path
    };
  });

  // attach animated props to an SVG path using animatedProps
  return <Svg><Path animatedProps={animatedProps}/ fill="black"></Svg>
}
```
