---
id: useFrameCallback
title: useFrameCallback
sidebar_label: useFrameCallback
---

:::tip

useFrameCallback is available since v2.10.0

:::

This hook allows you to run a piece of code on every frame update.

```js
useFrameCallback(callback: (frameInfo: FrameInfo) => void, autostart = true): [FrameCallback]
```

### Arguments

#### `callback` [Function]

A single worklet function that will be called on every frame update.
This function receives a [`FrameInfo`](#frameinfo-object) object as an argument.

#### `autostart` [boolean]

Optional boolean that specifies if the callback should start running when
registration is complete. This argument defaults to `true`.

### Returns

An object of type [`FrameCallback`](#framecallback-object) which allows you to read and control the
callback state.

### Types

#### `FrameCallback: [object]`

Properties:

- `setActive: (isActive: boolean) => void`: begins / stops listening for frame updates
- `isActive: boolean`: indicates whether the callback is active (`true`)
  or not (`false`)
- `callbackId: number`: a unique identifier of the callback function

#### `FrameInfo: [object]`

Properties:

- `timestamp: number`: the system time (in milliseconds) when the last
  frame was rendered
- `timeSincePreviousFrame: number | null`: time (in milliseconds) since last frame. This value
  will be `null` on the first frame after activation. Starting from the second frame,
  it should be ~16 ms on 60 Hz or ~8 ms on 120 Hz displays (when there is no lag)
- `timeSinceFirstFrame: number`: time (in milliseconds) since the callback was last activated

## Example

```js {13-21}
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function FrameCallbackExample() {
  const x = useSharedValue(0);

  const frameCallback = useFrameCallback((frameInfo) => {
    if (frameInfo.timeSincePreviousFrame === null) {
      console.log('First frame!');
    } else {
      console.log(
        `${frameInfo.timeSincePreviousFrame} ms have passed since the previous frame`
      );
    }
    // Move the box by one pixel on every frame
    x.value += 1;
  }, false);

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
    <View>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Button
        title="Start/stop"
        onPress={() => frameCallback.setActive(!frameCallback.isActive)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
  },
});
```
