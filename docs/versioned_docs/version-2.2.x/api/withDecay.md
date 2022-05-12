---
id: withDecay
title: withDecay
sidebar_label: withDecay
---

Starts a velocity based "scroll" animation.

### Arguments

#### `options` [object]

Object containing animation configuration.
Allowed parameters are listed below:

| Options        | Default | Description                                  |
| -------------- | ------- | -------------------------------------------- |
| velocity       | 0       | Initial velocity                             |
| deceleration   | 0.998   | Rate of decay                                |
| clamp          | []      | Array of two animation boundaries (optional) |
| velocityFactor | 1       | Factor to modify velocity unit (optional)    |

##### `velocityFactor`
The default unit of velocity in decay is pixel per second but it can be problematic when you want to animate value not related to pixels for example opacity `[0, 1]` or progress bar `[0, 1]`. In this case, you can use `velocityFactor` property with value `< 1` to modify the velocity of change to more matched for the required domain.

#### `callback` [function]\(optional\)

The provided function will be called when the animation is complete.
In case the animation is cancelled, the callback will receive `false` as the argument, otherwise it will receive `true`.

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](useAnimatedStyle).

## Example

```js
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
    onEnd: (evt) => {
      x.value = withDecay({
        velocity: evt.velocityX,
        clamp: [0, 200], // optionally define boundaries for the animation
      });
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
