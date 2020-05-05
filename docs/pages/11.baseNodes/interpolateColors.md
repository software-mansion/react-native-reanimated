## `interpolateColors`

```js
interpolateColors(node, {
  // Input range for the interpolation. Should be monotonically increasing.
  inputRange: [nodeOrValue...],
  // Output colors range for the interpolation in a rgba array integer format,
  // should be the same length as the input range.
  outputRgbaRange: [nodeOrValue...],
})
```

Maps an input value within a range to an output value within a color range.

Example:

```js
const color = Animated.interpolateColors(node, {
  inputRange: [0, 1],
  outputRgbaRange: [[255, 0, 0, 1], [0, 255, 0, 1]],
});

return <Animated.View style={{ backgroundColor: color }} />;
```
