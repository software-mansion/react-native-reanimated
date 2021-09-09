---
id: convertCoords
title: convertCoords
sidebar_label: convertCoords
---

Determines the location on the screen, relative to the given view. It might be useful, when there are only absolute coordinates available and you need coordinates relative to the parent.

### Arguments

#### animatedRef

The product of [`useAnimatedRef`](../hooks/useAnimatedRef) is a Reanimated's extension of a standard React's ref(delivers view tag on the UI thread). This ref should be passed as a prop to view relative to which we want to know coordinates.

#### x

Absolute `x` coordinate.

#### y

Absolute `y` coordinate

### Returns

Object which contains relative coordinates

- `x`
- `y`

### Example

```js
const Comp = () => {
  const aref = useAnimatedRef();
  // ...

  useDerivedValue(() => {
    const coords = convertCoords(aref, x, y);
    // ...
  });

  return <View ref={aref} />;
};
```
