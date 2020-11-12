---
id: runOnJS
title: runOnJS
sidebar_label: runOnJS
---

When you call a function on UI thread you can't be sure if you call a worklet or a callback from JS thread. To make it more transparent we introduce runOnJS method which calls a callback asynchronously. If you call a callback without this method then an exception will be thrown.

#### Note

If you want to invoke some function from external library in `runOnJS` please wrap it into a separate function.

Code like this may not work:

```js
useDerivedValue(() => {
    runOnJS(externalLibraryFunction)(args);
});
```

But something like this will work:

```js
const wrapper = (args) => {
    externalLibraryFunction(args)
}
useDerivedValue(() => {
    runOnJS(wrapper)(args);
});
```

### Arguments

#### `fn` [function]

The first and the only argument is a function which is supposed to be run.

### Returns

`runOnJS` returns a function which can be safely run from UI thread.

## Example

Here is an example of calling a javascript callback from the UI thread:

```js {22}
import {
  useSharedValue,
  runOnJS,
  useDerivedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function App() {
  const randomWidth = useSharedValue(10);
  const lastResults = [];

  const recordResult = (result) => {
    lastResults.push(result);
    if (lastResults.length > 3) {
      lastResults.shift();
    }
  }

  useDerivedValue(() => {
    runOnJS(recordResult)(randomWidth.value);
  });

  return (
    <View>
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.round(Math.random() * 350);
        }}
      />
    </View>
  );
}

```
