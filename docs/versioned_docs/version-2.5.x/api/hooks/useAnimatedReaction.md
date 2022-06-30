---
id: useAnimatedReaction
title: useAnimatedReaction
sidebar_label: useAnimatedReaction
---

`useAnimatedReaction` hook allows performing certain actions on some shared values' change. The key idea is, all of the shared values included in the first worklet are the inputs set. Every time any of those change both worklets are triggered in the order specified above. Also the second worklet may modify any shared values excluding those used in the first worklet.

### Arguments

#### `prepare` [Function]

worklet used for data preparation for the second parameter. It also defines the inputs, in other words on which shared values change will it be called.

#### `react` [Function]

worklet which takes data prepared by the `prepare` callback (being the first parameter of the hook) and performs some actions. As a second parameter it receives a result of the previous `prepare` call(starting with `null`). It can modify any shared values but those which are mentioned in the first worklet. Beware of that, because this may result in endless loop and high cpu usage.

#### `dependencies` [Array]

Optional array of values which changes cause this hook to receive updated values during rerender of the wrapping component. This matters when, for instance, worklet uses values dependent on the component's state.

Example:

```js {10}
const App = () => {
  const [state, setState] = useState(0);
  const sv1 = useSharedValue(0);
  const sv2 = useSharedValue(0);

  const derived = useAnimatedReaction(() => {
    return sv1.value * state;
  }, (result, previous) => {
    if (result !== previous) {
        sv2.value = result - 5;
    }
  }, dependencies);
  //...
  return <></>
}
```

`dependencies` here may be:

- `undefined`(argument skipped) - worklets will be rebuilt if there is any change in their bodies or any values from their closure(variables from outer scope used in worklet),
- empty array(`[]`) - worklets will be rebuilt only if their body change,
- array of values(`[val1, val2, ..., valN]`) - worklets will be rebuilt if there is any change in thier bodies or any values from the given array.

## Example

```js
const x = useSharedValue(0);
const x2 = useSharedValue(0);

const maxX2 = 80;
useAnimatedReaction(
  () => {
    return x.value / 1.5;
  },
  (data) => { // data holds what was returned from the first worklet's execution
    if (x2.value < maxX2) {
      x2.value = data;
    }
  }
);
```
