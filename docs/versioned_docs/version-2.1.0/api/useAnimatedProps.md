---
id: useAnimatedProps
title: useAnimatedProps
sidebar_label: useAnimatedProps
---

This hook is a counterpart of [`useAnimatedStyle`](useAnimatedStyle.md) hook, but works for a non-style view properties.
It allows for defining a set of native view properties that can be updated on the UI thread as a response to a Shared Value change.
Similarily to [`useAnimatedStyle`](useAnimatedStyle.md), this hook takes a single worklet (it is not necessary to add `worklet` directive here, because the method will be converted to worklet automatically).
The provided worklet is responsible for returning a object with view properties.

Only "native" properties of "native views" can be set via `useAnimatedProps`.
The most common usecase for this hook is when we want to animate properties of some third-party native component, since most of the properties for the core React Native components are a part of the styles anyways (at least the properties for which it makes sense to be animated).
You can use the following functions to animate properties that Reanimated don't support by default:

1. `addWhitelistedNativeProps()` is used to animate properties that trigger layout recalculation, you can find them [here](https://github.com/software-mansion/react-native-reanimated/blob/master/src/ConfigHelper.js#L31).

2. `addWhitelistedUIProps()` is used for properties that are updated directly on the UI thread, currently allowed props are listed [here](https://github.com/software-mansion/react-native-reanimated/blob/master/src/ConfigHelper.js#L6).

In order to connect the `useAnimatedProps` hook result to a view, you need to pass it as `animatedProps` property to the `Animated` version of the component (e.g., `Animated.View`).
The `animatedProps` property is added when a native component is wrapped with `Animated.createAnimatedComponent`.

If the animated props worklet uses any shared values, it will be executed upon these values updates and the connected view will be updated.

In the example below we use [`react-native-svg`](https://github.com/react-native-community/react-native-svg) package and animate one of the native properties of SVG views:

## Example

```js {12-16}
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
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
    m -${radius.value}, 0
    a ${radius.value},${radius.value} 0 1,0 ${radius.value * 2},0
    a ${radius.value},${radius.value} 0 1,0 ${-radius.value * 2},0
    `;
    return {
      d: path,
    };
  });

  // attach animated props to an SVG path using animatedProps
  return (
    <Svg>
      <AnimatedPath animatedProps={animatedProps} fill="black" />
    </Svg>
  );
}
```

# createAnimatedPropAdapter

In some third-party libraries(but also may happen in users' custom components), props are named differently on the API layer than they really are underneath. This tool lets users handle such situations by defining a proper way to convert specific props.

Note: It is recommended to create adapters outside of components. `createAnimatedPropAdapter` is not a hook and should not be called on every component's rerender.

### Arguments

#### `adapter` [Function]

Required parameter, this is a function that would receive an object of props that are supposed to be updated on the UI thread. The function itself doesn't have to return anything - modifying the received object is enough.

#### `nativeProps` [Array]

A list of props that should be added to `NATIVE_THREAD_PROPS_WHITELIST`.

## Example

```js {3,9,24}
class Hello extends React.Component {
  render() {
    return <Text style={{ fontSize: this.props.helloSize }}>Hello</Text>;
  }
}

const AnimatedHello = Animated.createAnimatedComponent(Hello);

const adapter = createAnimatedPropAdapter(
  (props) => {
    if (Object.keys(props).includes('helloSize')) {
      props.fontSize = props.helloSize;
      delete props.helloSize;
    }
  },
  ['fontSize']
);

export default function Component() {
  const sv = useSharedValue(14);
  const helloProps = useAnimatedProps(
    () => ({ helloSize: sv.value }),
    null,
    adapter
  );

  return <AnimatedHello animatedProps={helloProps} />;
}
```
