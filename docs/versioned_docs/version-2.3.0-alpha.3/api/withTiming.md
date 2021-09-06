---
id: withTiming
title: withTiming
sidebar_label: withTiming
---

Starts a time based animation.

### Arguments

#### `toValue` [number | string]

The target value at which the animation should conclude.
It can be specified as a color value by providing string like: `rgba(255, 105, 180, 0)`.

Currently supported formats are:

- `"rgb(r, g, b)"`
- `"rgba(r, g, b, a)"`
- `"hsl(h, s, l)"`
- `"hsla(h, s, l, a)"`
- `"#rgb"`
- `"#rgba"`
- `"#rrggbb"`
- `"#rrggbbaa"`

#### `options` [object]

Object containing animation configuration.
Allowed parameters are listed below:

| Options  | Default            | Description                                            |
| -------- | ------------------ | ------------------------------------------------------ |
| duration | 300                | How long the animation should last                     |
| easing   | in-out quad easing | Worklet that drives the easing curve for the animation |

For `easing` parameter we recommend using one of the pre-configured worklets defined in `Easing` module.

#### `callback` [function]\(optional\)

The provided function will be called when the animation is complete.
In case the animation is cancelled, the callback will receive `false` as the argument, otherwise it will receive `true`.

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](useAnimatedStyle).

## Example

```js
import { Button } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

function App() {
  const width = useSharedValue(50);

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(width.value, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    };
  });

  return (
    <View>
      <Animated.View style={[styles.box, style]} />
      <Button onPress={() => (width.value = Math.random() * 300)} title="Hey" />
    </View>
  );
}
```
