---
id: measure
title: measure
sidebar_label: measure
---

Determines the location on screen, width, and height in the viewport of the given view synchronously and returns an object with measured dimensions or `null` if the view cannot be measured.

If you need the measurements as soon as possible and you don't need `pageX` and `pageY`, consider using the [`onLayout`](https://reactnative.dev/docs/view#onlayout) property instead.

:::info
You can use `measure()` only on rendered components. For example, calling `measure()` on an offscreen `FlatList` item will return `null`. It is therefore a good practice to perform a `null`-check before using the response.
:::

:::tip
If you call `measure` inside [`useAnimatedStyle`](/docs/2.x/api/hooks/useAnimatedStyle), you may get the following warning:

> [Reanimated] measure() was called from the main JS context. Measure is only available
> in the UI runtime. (...)

That's because in React Native apps, `useAnimatedStyle` worklet is first evaluated on the JS context during the first render, thus before rendering has been completed in native. This is safe to ignore, but if you don't want this warning to appear then wrap the call like this:

```js
if (_WORKLET || isWeb) {
  const measured = measure(animatedRef);
  if (measured !== null) {
    // ...
  }
}
```

:::

:::info
`measure` is not available when Chrome Developer Tools (remote JS debugger) is attached. However, the recommended tool for debugging React Native apps is Flipper (Chrome DevTools) which supports `measure`. Check out more details [here](/docs/2.x/guide/debugging).
:::

### Arguments

#### animatedRef

The product of [`useAnimatedRef`](/docs/2.x/api/hooks/useAnimatedRef) which is Reanimated's extension of a standard React ref (delivers the view tag on the UI thread).

### Returns

An object of type `MeasuredDimensions`, which contains these fields:

- `x`
- `y`
- `width`
- `height`
- `pageX`
- `pageY`

If the measurement could not be performed, returns `null`.

### Example

```js
const Comp = () => {
  const aref = useAnimatedRef();

  useDerivedValue(() => {
    const measured = measure(aref);
    if (measured !== null) {
      const { x, y, width, height, pageX, pageY } = measured;
      console.log({ x, y, width, height, pageX, pageY });
    } else {
      console.warn('measure: could not measure view');
    }
  });

  return <View ref={aref} />;
};
```
