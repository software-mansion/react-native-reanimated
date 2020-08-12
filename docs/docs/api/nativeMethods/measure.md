---
id: measure
title: measure
sidebar_label: measure
---

> Due to time constraints we weren't able to finish this page.

### Arguments

#### animatedRef

### Returns

Object which contains following fields

- `x`
- `y`
- `width`
- `height`
- `pageX`
- `pageY`

### Example

```js
const Comp = () => {
  const aref = useAnimatedRef();

  useDerivedValue(() => {
    const measured = measure(aref);
    // ...
  });

  return <View ref={aref} />;
};
```
