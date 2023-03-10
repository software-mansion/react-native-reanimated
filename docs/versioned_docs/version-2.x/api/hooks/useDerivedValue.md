---
id: useDerivedValue
title: useDerivedValue
sidebar_label: useDerivedValue
---

This hook allows for creating shared value reference that can change in response to updating of one or more other shared values.

The hook returns the same type of a shared value reference instance as [`useSharedValue`](useSharedValue) hook.

### Arguments

#### `updaterWorklet` [worklet]

The first argument is a worklet that gets triggered whenever at least one of the shared values used in that worklet changes.
It is expected that the worklet return a new JS value (number, string, bool, Object, Array) that will be assigned to the shared value reference the hook returns.
The `updaterWorklet` will be triggered immediately upon use of this hook in order to calculate the initial payload for the returned shared value.

#### `dependencies` [Array]

Optional array of values which changes cause this hook to receive updated values during rerender of the wrapping component. This matters when, for instance, worklet uses values dependent on the component's state.

Example:

```js {7}
const App = () => {
  const [state, setState] = useState(0);
  const sv = useSharedValue(state);

  const derived = useDerivedValue(() => {
    return sv.value * state;
  }, dependencies);
  //...
  return <></>
}
```

`dependencies` here may be:

- `undefined`(argument skipped) - worklet will be rebuilt if there is any change in it's body or any values from it's closure(variables from outer scope used in worklet),
- empty array(`[]`) - worklet will be rebuilt only if it's body changes,
- array of values(`[val1, val2, ..., valN]`) - worklet will be rebuilt if there is any change in it's body or any values from the given array.

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
