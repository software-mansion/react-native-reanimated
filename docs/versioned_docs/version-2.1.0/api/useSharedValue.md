---
id: useSharedValue
title: useSharedValue
sidebar_label: useSharedValue
---

Use this hook to create a reference to a JavaScript value that can be shared with worklets.

Shared Values serve a similar purpose to React Native's [`Animated.Value`s](https://reactnative.dev/docs/animatedvalue).
They can carry data, provide a way to react to changes, and also drive animations.
If you aren't familiar with the concept of Shared Values in Reanimated v2, please check [Shared Values guide](../shared-values) first.

When shared value reference is created using this hook, it can be accessed and modified by worklets.
Shared Values can also be modified from the React Native thread directly, in which case the update is going to be asynchronous.

Shared Values are just javascript objects, so you can pass them to children components or define your own hooks that create them.

### Arguments

#### `initialValue` [number|string|bool|Object|Array|Function]

The first argument takes the initial value, which could be any of the primitive JavaScript types, and assigns it as the initial value of the created Shared Value.
The value then can be read from the Shared Value reference using `.value` attribute.

### Returns

The hook returns a reference to shared value initialized with the provided data.
The reference is an object with `.value` property, that can be accessed and modified from worklets, but also updated directly from the main JS thread.

## Example

In the below example we render a button, which triggers random updates of a shared value directly from the React Native JS thread.

```js {5}
import { Button } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

function App() {
  const width = useSharedValue(50);

  return (
    <View>
      <SomeComponent width={width} />
      <Button onPress={() => (width.value = Math.random() * 300)} />
    </View>
  );
}
```
