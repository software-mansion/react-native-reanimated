## `color`

```js
color(red, green, blue, alpha);
```

Creates a color node in RGBA format, where the first three input nodes should have _integer_ values in the range 0-255 (consider using `round` node if needed) and correspond to color components Red, Green and Blue respectively. Last input node should have a value between 0 and 1 and represents alpha channel (value `1` means fully opaque and `0` completely transparent). Alpha parameter can be ommited, then `1` (fully opaque) is used as a default.

The returned node can be mapped to view properties that represents color (e.g. [`backgroundColor`](https://facebook.github.io/react-native/docs/view-style-props.html#backgroundcolor)).

##### Note: In order to interpolate color output values, use [`interpolateColors`](interpolate-colors.html) instead.
