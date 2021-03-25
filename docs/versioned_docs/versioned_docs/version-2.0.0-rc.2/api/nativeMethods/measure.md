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

### Note

You can use `measure()` only on rendered components. Good practice is to wrap function call with `try{} catch{}` if there is a possibility to call function on item which is not rendered, for example: invisible item on screen from FlatList.