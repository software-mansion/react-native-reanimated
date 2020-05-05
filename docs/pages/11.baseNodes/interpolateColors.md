## `interpolateColors`

```js
interpolateColors(node, {
  // Input range for the interpolation. Should be monotonically increasing.
  inputRange: [nodeOrValue, ...],

  // Output colors range for the interpolation.
  // Should be the same length as the input range.
  //
  // Each color needs to be a 4-elements number array like `[r, g, b, a]`,
  // where `r` `g` `b` values are in 0-255 range, and `a` is a float in 0-1 range.
  outputRgbaRange: [color, ...],
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
