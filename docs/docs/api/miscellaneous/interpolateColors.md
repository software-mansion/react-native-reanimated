---
id: interpolateColors
title: 'interpolateColor'
sidebar_label: 'interpolateColor'
---

Maps input range to output colors using linear interpolation. It works just like `interpolate` function but the output is color string in `rgba(r, g, b, a)` notation.

### Arguments

#### `value` [Float]

Value from within the input range that should be mapped to a value from the output range.

#### `input range` [Float[]]

An array of Floats that contains points that indicate the range of the input value. Values in the input range should be increasing.

#### `output range` [(string | number)[]]

An array of colors (strings like `'red'`, `'#ff0000'`, `'rgba(255, 0, 0, 0.5)'` etc.) that contains points that indicate the range of the output value. It should have at least the same number of points as the input range.

#### `color space` [String]

Can be either `'RGB'` or `'HSV'`.

#### `options` [Object]

Object containg color interpolation options. Allowed parameters are listed below:

| Options                      | Default | Description                                                                                                                                                                                                                                                 |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gamma                        | 2.2     | Gamma parameter used in gamma correction.                                                                                                                                                                                                                   |
| useCorrectedHSVInterpolation | true    | Sometimes (for example when interpolating from yellow to purple) HSV interpolation goes through many other hues. This option allows to reduce the number of hues in such cases by treating HSV hues like a circular spectrum and choosing the shortest arc. |

### Returns

`interpolateColor` returns the color after interpolation from within the output range in `rgba(r, g, b, a)` format.

## Example

```js
const Component = () => {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(progress.value, [0, 1], ['red', 'green']),
    };
  });

  return (
    <View>
      <Animated.View style={[{ width: 100, height: 100 }, animatedStyle]} />
      <Button
        onPress={() => {
          progress.value = withTiming(1 - progress.value, { duration: 1000 });
        }}
        title="run animation"
      />
    </View>
  );
}

```