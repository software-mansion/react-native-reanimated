---
id: runOnJS
title: runOnJS
sidebar_label: runOnJS
---

When you call a function on the UI thread you can't be sure if you're calling a worklet or a callback from the JS thread. To make it more transparent we introduced `runOnJS`, which calls a callback asynchronously. An exception will be thrown if you call a JS callback without this function.

:::info

If you want to invoke some function from an external library in `runOnJS` please wrap it in a separate function.

Code like this may not work:

```js
useDerivedValue(() => {
  runOnJS(externalLibraryFunction)(args);
});
```

But something like this will work:

```js
const wrapper = (args) => {
  externalLibraryFunction(args);
};
useDerivedValue(() => {
  runOnJS(wrapper)(args);
});
```

This is because internally `runOnJS` uses `Object.defineProperty`. Therefore if we want to call a method of some object we may not have access to `this` inside the called function.

This code shows how it works:

```js
class A {
  foo() {
    //... playing with [this]
  }
}

const a = new A();
const ob = {};
// We do something like this in runOnJS
Object.defineProperty(ob, 'foo', { enumerable: false, value: a.foo });

a.foo(5); // Normal [this] access
ob.foo(5); // [this] is not correct
```

:::

### Arguments

#### `fn` [function]

The first and only argument is the function that is supposed to be run.

### Returns

`runOnJS` returns a function which can be safely run from the UI thread.

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
  };

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
