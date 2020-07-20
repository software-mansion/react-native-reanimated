---
id: repeat
title: repeat
sidebar_label: repeat
---

Repeats the provided animation several times.

### Arguments

#### `animation` [animation]

The animation that will be repeated.

#### `numberOfReps` [number] (default: `2`)

Number of repetations that the animation is going to be run for.
When negative, the animation will be repeated forever (until the shared value is torn down or the animation is cancelled).

#### `reverse` [bool] (default: `false`)

Specify whether we should attempt to reverse the animation every other repetition.
When `true`, this will cause the animation to run from the current value to the destination, after that the same animation will run in the reverse direction.
Note that this option will only work when the provided animation is a plain, non-modified animation like [`withTiming`](api/withTiming) or [`withSpring`](api/withSpring).
The option is not supported for animation wrapped using other animation modifiers like `delay` or `sequence`.

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](useAnimatedStyle).

## Example

The provided shared value will animate from its current value to 70 using timing animation, and then back to the original value.

```js
sharedValue.value = repeat(withTiming(70), 2, true)
```

