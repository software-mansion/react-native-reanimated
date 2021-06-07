---
id: withSpring
title: withSpring
sidebar_label: withSpring
---

Starts a spring-based animation.

### Arguments

#### `toValue` [number | string]

The target value at which the spring should settle.
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

Object carrying spring configuration.
Allowed parameters are listed below:

| Options                   | Default | Description |
| ------------------------- | ------- | ----------- |
| damping                   | 10      |             |
| mass                      | 1       |             |
| stiffness                 | 100     |             |
| overshootClamping         | false   |             |
| restDisplacementThreshold | 0.001   |             |
| restSpeedThreshold        | 0.001   |             |

#### `callback` [function]\(optional\)

The provided function will be called when the animation is complete.
In case the animation is cancelled, the callback will receive `false` as the argument, otherwise it will receive `true`.

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](useAnimatedStyle).

## Example

```js {20}
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

function App() {
  const x = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}
```
