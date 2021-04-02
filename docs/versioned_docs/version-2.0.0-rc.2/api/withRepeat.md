---
id: withRepeat
title: withRepeat
sidebar_label: withRepeat
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
Note that this option will only work when the provided animation is a plain, non-modified animation like [`withTiming`](withTiming.md) or [`withSpring`](withSpring.md).
The option is not supported for animation wrapped using other animation modifiers like `withDelay` or `withSequence`.

#### `callback` [function]\(optional\)

This function will be called when all repetitions of provided animation are complete or when `withRepeat` is cancelled.
In case the animation is cancelled, the callback will receive `false` as the argument, otherwise it will receive `true`.

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](useAnimatedStyle.md).

## Example

The provided shared value will animate from its current value to 70 using timing animation, and then back to the original value.

```js
sharedValue.value = withRepeat(withTiming(70), 2, true);
```

One more example with the callbacks

```js
sharedValue.value = withRepeat(
  withTiming(70, undefined, (finished, currentValue) => {
    if (finished) {
      console.log('current withRepeat value is ' + currentValue);
    } else {
      console.log('inner animation cancelled');
    }
  }),
  10,
  true,
  (finished) => {
    const resultStr = finished
      ? 'All repeats are completed'
      : 'withRepeat cancelled';
    console.log(resultStr);
  }
);
```

The callback passed to the inner animation(here `withTiming`) will be called on every repeat. The first argument tells us whether the animation finished or was cancelled. The second one hold animation's current value(when the animation has been cancelled it is `undefined`).
The callback passed to `withRepeat` is called in the end when animation is finished or cancelled with `finished` set accordingly.
