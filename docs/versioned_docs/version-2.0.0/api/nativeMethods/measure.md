---
id: measure
title: measure
sidebar_label: measure
---

Determines the location on screen, width, and height of the given view. Note that these measurements are not available until after the rendering has been completed in native. If you need the measurements as soon as possible, consider using [`onLayout`](https://reactnative.dev/docs/view#onlayout) instead.

This function is implemented on native platforms only. On the web, it's sufficient to use a standard version of the `measure` which is available on most of the default components provided by React Native(it's [here](https://github.com/facebook/react-native/blob/65975dd28de0a7b8b8c4eef6479bf7eee5fcfb93/Libraries/Renderer/shims/ReactNativeTypes.js#L105)). In such a case it should be invoked in the following way(note it's asynchronous so if you want to make it synchronous you should use `Promise`):

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

The product of [`useAnimatedRef`](../useAnimatedRef) which is a Reanimated's extension of a standard React's ref(delivers view tag on the UI thread).

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
