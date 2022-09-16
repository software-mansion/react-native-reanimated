---
id: measure
title: measure
sidebar_label: measure
---

Determines the location on screen, width, and height of the given view. Note that these measurements are not available until after the rendering has been completed in native. If you need the measurements as soon as possible, consider using [`onLayout`](https://reactnative.dev/docs/view#onlayout) instead.

This function is implemented on native platforms only. On web, it's sufficient to use a standard version of the `measure` which is available on most of the default components provided by React Native (it's [here](https://github.com/facebook/react-native/blob/65975dd28de0a7b8b8c4eef6479bf7eee5fcfb93/Libraries/Renderer/shims/ReactNativeTypes.js#L105)). In such a case it should be invoked in the following way (note it's asynchronous so if you want to make it synchronous you should use `Promise`):

```javascript
const aref = useAnimatedRef();
new Promise((resolve, reject) => {
  if (aref && aref.current) {
    aref.current.measure((x, y, width, height, pageX, pageY) => {
      resolve({ x, y, width, height, pageX, pageY });
    });
  } else {
    reject(new Error('measure: animated ref not ready'));
  }
});
```

### Arguments

#### animatedRef

The product of [`useAnimatedRef`](../hooks/useAnimatedRef) which is Reanimated's extension of a standard React ref (delivers the view tag on the UI thread).

### Returns

An object of type `MeasuredDimensions`, which contains these fields:

- `x`
- `y`
- `width`
- `height`
- `pageX`
- `pageY`

If the measurement could not be performed, returns `null`.

You can use `measure()` only on rendered components. For example, calling `measure()` on an offscreen `FlatList` item will return `null`. It is therefore a good practice to perform a `null`-check before using the response.

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