## `interpolateColors`

```js
interpolateColors(node, {
  // Input range for the interpolation. Should be monotonically increasing.
  inputRange: [nodeOrValue, ...],

  // Output colors range for the interpolation.
  // Should be the same length as the input range.
  //
  // Each color should be a string like "red" "#ff0" "#ff0000" "rgba(255, 0, 0, 1)"
  // or a number like `0xrrggbbaa`.
  outputColorRange: [color, ...],
})
```

Maps an input value within a range to an output value within a color range.

Example:

```js
const color = Animated.interpolateColors(node, {
  inputRange: [0, 1],
  outputColorRange: ['red', 'blue'],
});

return <Animated.View style={{ backgroundColor: color }} />;
```
