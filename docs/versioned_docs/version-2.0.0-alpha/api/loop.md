---
id: loop
title: loop
sidebar_label: loop
---

Allows for the provided animation to loop back and forth between the value at which the animation started and the target value for the provided animation.

### Arguments

#### `loopedAnimation` [animation]

The animation that will be run in a loop.

#### `numberOfLoops` [number] (default: 1)

Number of cycles the looped animation will perform before finishing.
When negative, the loop will run forever (until the shared value is torn down or the animation is cancelled).
When 1 is passed, the loop will make the original value go to the target destination and back.
In case you want to finish at the target destination, you can pass 0.5 (or 1.5, 2.5, etc if you want more half loops to be performed)

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](useAnimatedStyle).

## Example

The provided shared value will animate from its current value to 70 using timing animation, and then back to the original value.

```js
sharedValue.value = loop(withTiming(70))
```

