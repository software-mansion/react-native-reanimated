---
id: runOnUI
title: runOnUI
sidebar_label: runOnUI
---

Enables executing worklet functions on the UI thread. Note that UI execution is asynchronous from the caller’s perspective. When you pass arguments, they will be copied to the UI context.

### Arguments

#### `fn` [function]

The first and only argument is a worklet function that is supposed to be run.

### Returns

`runOnUI` returns a function which will be executed on UI thread.

## Example

```js {12}
import { runOnUI } from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function App() {
  const someWorklet = (greeting) => {
    'worklet';
    console.log(greeting, 'From the UI thread');
  };

  const onPress = () => {
    runOnUI(someWorklet)('Howdy');
  };

  return (
    <View>
      <Button title="toggle" onPress={onPress} />
    </View>
  );
}
```
