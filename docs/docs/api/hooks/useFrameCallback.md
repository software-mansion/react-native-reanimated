---
id: useFrameCallback
title: useFrameCallback
sidebar_label: useFrameCallback
---

This hook allows you to run a piece of code on every frame update.

```js
useFrameCallback(callback: (frameTimings: FrameTimings) => void, autostart = true): [FrameCallback]
```

### Arguments

#### `callback` [Function]

Single worklet function that will be called on every frame update.
This function recieves a [`FrameTimings`](#frametimings-object) object as na argument.

#### `autostart` [boolean]

Optional boolean that specifies if the callback should start running when
registration is complete. This argument defaults to `true`.

### Returns

An object of type [`FrameCallback`](#framecallback-object) which allows you to read and control the
callback state.

### Types

#### `FrameCallback: [object]`

Properties:
* `setActive: (isActive: boolean) => void`: begins / stops listening for frame updates
* `isActive: boolean`: indicates whether the callback is active (`true`)
                    or not (`false`)
* `callbackId: number`: a unique identifier of the callback function

#### `FrameTimings: [object]`

Properties:
* `timestamp: number`: the current system time (in milliseconds)
* `timeSinceLastFrame: number | null`: time (in milliseconds) since last frame - this value
  will be null on the first frame after activation. Starting from the second frame,
  it should be ~16ms on 60Hz or ~8ms on 120Hz displays (when there is no lag)
* `elapsedTime: number`: time (in milliseconds) since the callback was last activated

## Example

```js {13-17}
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import {Button, View} from 'react-native';

import React from 'react';

export default function FrameCallbackExample() {
  const x = useSharedValue(0);

  const frameCallback = useFrameCallback((frameTimigs) => {
    console.log(frameTimings.frameTime + 'ms', 'have passed since the previous frame');
    // Move the box by one pixel on every frame
    x.value += 1;
  }, false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        }
      ],
    };
  });

  return (
    <View>
      <Animated.View style={[styles.box, animatedStyle1]} />
      <Button title={'Start/stop'} onPress={() => frameCallback.setActive(!frameCallback.isActive)}>
    </View>
  );
}
```