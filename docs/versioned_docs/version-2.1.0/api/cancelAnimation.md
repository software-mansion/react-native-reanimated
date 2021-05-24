---
id: cancelAnimation
title: cancelAnimation
sidebar_label: cancelAnimation
---

Starts a time-based animation.

### Arguments

#### `sharedValue` [SharedValueRef]

The value for which we want the previously started animation to be cancelled.
If there was no animation started on that value, or the animation completed, no error will be thrown.

## Example

```js {5}
const someValue = useSharedValue(0);

const gestureHandler = useAnimatedGestureHandler({
  onStart: (_, ctx) => {
    cancelAnimation(someValue);
  },
});
```
