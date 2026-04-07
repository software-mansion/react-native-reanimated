---
id: withDelay
title: withDelay
sidebar_label: withDelay
---

Allows for the provided animation to start with a specified delay.

In case the value for which we are starting the delayed animation is running a previous animation, that animation won't be cancelled until the new animation starts after the delay.
If you want the animation to cancel immediately, use the [`cancelAnimation`](/docs/2.x/api/animations/cancelAnimation) method.

### Arguments

#### `delayMS` [number]

Delay in milliseconds after which we want the provided animation to start.

#### `delayedAnimation` [animation]

The animation that will be started after the delay.

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](/docs/2.x/api/hooks/useAnimatedStyle).

## Example

The timing animation will start on the `sharedValue` after one second.

```js
sharedValue.value = withDelay(1000, withTiming(70));
```
