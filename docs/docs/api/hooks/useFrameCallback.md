---
id: useFrameCallback
title: useFrameCallback
sidebar_label: useFrameCallback
---

This hook allows you to run a piece of code on every frame update.

```js
useFrameCallback(updater: () => void, autostart: boolean = true) => [FrameCallback]
```

### Arguments

#### `callback` [Function]

Single worklet that will be called on every frame update without any arguments.

#### `autostart` [boolean]

Optional boolean that specifies if the callback should start running when
registration is complete. This argument defaults to `true`.

### Returns

An object of type `FrameCallback` which allows you to read and control the
callback state.

### Types

#### `FrameCallback: [object]`

Properties:
* `setActive: (isActive: boolean) => void`: begins / stops listening for frame updates
* `isActive: boolean`: indicates whether the callback is active (`true`)
                    or not (`false`)
* `callbackId: number`: a unique identifier of the callback function

## Example

```js {13-16}
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import {Button, View} from 'react-native';

import React from 'react';

export default function FrameCallbackExample() {
  const x = useSharedValue(0);

  const frameCallback = useFrameCallback(() => {
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