---
id: useAnimatedRef
title: useAnimatedRef
sidebar_label: useAnimatedRef
---

This hook provides extended functionality of a standard ref. You can assign it to some component like `<View ref={ animatedRef } />` and then access the target component via `animatedRef.current`. Besides, on the UI thread animated reference also contains the view tag of the target. It can be accessed like this: `const viewTag = animatedRef()`. This comes handy when using native methods like `scrollTo` and `measure`.

## Example

```js
const Comp = () => {
  const aref = useAnimatedRef()

  useDerivedValue(() => {
    const viewTag = aref();
    // ...
  })

  const componentRef = aref.current
  // ...

  return <View ref={aref} />;
}
```
