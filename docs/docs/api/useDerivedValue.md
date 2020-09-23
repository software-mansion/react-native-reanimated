---
id: useDerivedValue
title: useDerivedValue
sidebar_label: useDerivedValue
---

This hook allows for creating shared value reference that can change in response to updating of one or more other shared values.

The hook returns the same type of a shared value reference instance as [`useSharedValue`](useSharedValue) hook.

### Arguments

#### `updaterWorklet` [worklet]

The first and only argument is a worklet that gets triggered whenever at least one of the shared values used in that worklet changes.
It is expected that the worklet return a new JS value (number, string, bool, Object, Array) that will be assigned to the shared value reference the hook returns.
The `updaterWorklet` will be triggered immediately upon use of this hook in order to calculate the initial payload for the returned shared value.

### Returns

The hook returns a reference to a shared value initialized with the provided data.
The reference is an object with `.value` property, that can be accessed and modified from worklets, but also updated directly from the main JS thread.

## Example

In the below example we define a shared value named `progress` that can go from 0 to 1.
Then defined a derived shared value `width` that will respond to progress changes.
We calculate `width`'s value in the `useDerivedValue` worklet as a product of `progress`'s value times 250.
As a result `width`'s value will always stay in sync with changes made to `progress` shared value and will be equal to the `progress`s value times 250.

```js {6}
import { Button } from 'react-native';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';

function App() {
  const progress = useSharedValue(0);
  const width = useDerivedValue(() => {
    return progress.value * 250;
  });

  return (
    <View>
      <SomeComponent width={width} />
      <Button onPress={() => (progress.value = Math.random())} />
    </View>
  );
}
```


`useDerivedValue` is also useful when we want to run animations based on the props passed to the component.

Let's say we want to increase the width of the progress bar when the shared value in the `ComponentA` is updated.


```js {6}
import { Button } from 'react-native';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';

function ComponentA() {
  const progress = useSharedValue(0);
  const width = useDerivedValue(() => {
    return progress.value * 250;
  });

  return (
    <View>
      <ProgressBar width={width} />
      <Button onPress={() => (progress.value = Math.random())} />
    </View>
  );
}
```
```js {6}
import { Button } from 'react-native';
import Animated, { useSharedValue, useDerivedValue, useAnimatedStyle } from 'react-native-reanimated';

function ProgressBar({width}) {
  const widthStyle = useAnimatedStyle(() => {
    // if shared value was passed instead of derived shared value,
    // this worklet wouldn't have noticed the changes thus, no update would have happened
    return {
      width: width.value,
    }
  });

  return (
    <Animated.View style={[widthStyle]}>
      <Text>I'll animate when you change width in ComponentA</Text>
    </Animated.View>
  );
}
export default ProgressBar;
```
