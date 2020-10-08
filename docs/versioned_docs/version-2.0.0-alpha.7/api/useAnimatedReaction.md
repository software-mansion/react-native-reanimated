---
id: useAnimatedReaction
title: useAnimatedReaction
sidebar_label: useAnimatedReaction
---

`useAnimatedReaction` hook allows performing certain actions on some shared values' change. The key idea is, all of the shared values included in the first worklet are the inputs set. Every time any of those change both worklets are triggered in the order specified above. Also the second worklet may modify any shared values excluding those used in the first worklet.

There are two params:

- prepare - worklet used for data preparation for the second parameter. It also defines the inputs, in other words on which shared values change will it be called.

- react - worklet which takes data prepared by the one in the first parameter and performs some actions. It can modify any shared values but those which are mentioned in the first worklet. Beware of that, because this may result in endless loop and high cpu usage.

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
