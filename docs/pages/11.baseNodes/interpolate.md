## `interpolate`

```js
interpolate(node, {
  // Input range for the interpolation. Should be monotonically increasing.
  inputRange: [nodeOrValue...],
  // Output range for the interpolation, should be the same length as the input range.
  outputRange: [nodeOrValue...],
  // Sets the left and right extrapolate modes.
  extrapolate?: Extrapolate.EXTEND | Extrapolate.CLAMP | Extrapolate.IDENTITY,
  // Set the left extrapolate mode, the behavior if the input is less than the first value in inputRange.
  extrapolateLeft?: Extrapolate.EXTEND | Extrapolate.CLAMP | Extrapolate.IDENTITY,
  // Set the right extrapolate mode, the behavior if the input is greater than the last value in inputRange.
  extrapolateRight?: Extrapolate.EXTEND | Extrapolate.CLAMP | Extrapolate.IDENTITY,
})

Extrapolate.EXTEND; // Will extend the range linearly.
Extrapolate.CLAMP; // Will clamp the input value to the range.
Extrapolate.IDENTITY; // Will return the input value if the input value is out of range.
```

Maps an input value within a range to an output value within a range. Also supports different types of extrapolation for when the value falls outside the range and mapping to strings. For example, if you wanted to animate a rotation you could do:

```js
concat(
  interpolate(node, { inputRange: [0, 360], outputRange: [0, 360] }),
  'deg'
);
```

##### Note: In order to interpolate color output values, use [`interpolateColors`](interpolate-colors.html) instead.
