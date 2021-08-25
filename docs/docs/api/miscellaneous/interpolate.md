---
id: interpolate
title: Interpolate
sidebar_label: Interpolate
---

Sometimes you need to map value from one range to another. This is where you should use `interpolate` functions which approximates values between points in the output range and lets you map value inside the input range to corresponded approximation in the output range. It also supports few types of Extrapolation to enable mapping outside the range.

:::info
Be aware that `interpolate` was renamed in reanimated v2 to `interpolateNode` and should not be confused with `interpolate` from the new API. When using interpolate imported directly from react-native-reanimated v1, in v2 you should use interpolateNode instead. If you were using a class member method AnimatedValue.interpolate, no change is necessary.
:::

### Arguments

#### `value` [Float]

Value from within input range that should be map into value from output range.

#### `input range` [Float[]]

An array of Floats that contains points that indicate the range of the input value. Values in the input range should be increasing.

#### `output range` [Float[]]

An array of Floats that contains points that indicate the range of the output value. It should have at least the same number of points as the input range.

#### `extrapolation type` [Object | String]

Can be either object or string. If the object is passed it should specify extrapolation explicit for the right and left sides. If extrapolation for the side is not provided, it defaults to `Extrapolation.EXTEND`. Example extrapolation type object:

```js
const extrapolation = {
    extrapolateLeft: Extrapolation.CLAMP,
    extrapolateRight: Extrapolation.IDENTITYY
}
```

If the string is provided, the provided extrapolation type is applied to both sides.

:::info
Available extrapolation types:
* `Extrapolation.CLAMP` - clamps value to the edge of the output range.
* `Extrapolation.IDENTITY` - returns value that is being interpolate
* `Extrapolation.EXTEND` - approximates value even outside the range

Available extrapolation string values:
* `clamp`
* `identity`
* `extend`
:::

### Returns

`interpolate` returns the value after interpolation from within the output range.

## Example

```jsx
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';

export const HEADER_IMAGE_HEIGHT = Dimensions.get('window').width / 3;

export default function Test() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const animatedStyles = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0], [2, 1], { extrapolateRight: Extrapolation.CLAMP });

    return {
      transform: [{ scale: scale }],
    };
  });

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 20,
            left: 0,
            width: 20,
            height: 20,
            backgroundColor: 'blue',
          },
          animatedStyles,
        ]}
      />

      <Animated.ScrollView
        scrollEventThrottle={1}
        style={StyleSheet.absoluteFill}
        onScroll={scrollHandler}></Animated.ScrollView>
    </View>
  );
}
```