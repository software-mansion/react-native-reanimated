---
id: measure
title: measure
sidebar_label: measure
---

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
