# contrastColor

`contrastColor` lets you pick a text color that stays readable on a given background. It works like the [CSS `contrast-color()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/contrast-color) function – it returns either `'white'` or `'black'`, whichever has the greater [WCAG contrast ratio](https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio) against the provided color.

## Reference

```jsx
import Animated, {
  contrastColor,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

function App() {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['#000000', '#ffffff']
    );
    return {
      backgroundColor,
      // highlight-next-line
      color: contrastColor(backgroundColor),
    };
  });

  // ...

  return <Animated.Text style={animatedStyle}>Always readable</Animated.Text>;
}
```

Type definitions

```typescript
function contrastColor(color: string | number): 'white' | 'black';
```

### Arguments

#### `color`

The background color to contrast against. Accepts any color format supported by Reanimated – e.g. `'red'`, `'#ff0000'`, `'rgb(255, 0, 0)'`, `'rgba(255, 0, 0, 0.5)'`, `'hsl(0, 100%, 50%)'` or a number. The alpha channel is ignored. Invalid colors are treated as transparent black, so `'white'` is returned.

### Returns

`contrastColor` returns `'white'` or `'black'` – whichever has the higher contrast ratio with `color`. If both have the same contrast, `'white'` is returned.

## Remarks

* `contrastColor` is a worklet, so it can be used inside `useAnimatedStyle`, `useDerivedValue` and other worklets, as well as on the JavaScript thread.
* Just like CSS `contrast-color()`, the result is the better of the two options. With the WCAG 2.x formula, the selected color always has a contrast ratio of at least ~4.58:1 (which meets WCAG AA for normal text), but it doesn't guarantee the WCAG AAA (7:1) threshold – mid-tone backgrounds (e.g. `#767676`) are barely readable with either black or white.
* Pure red (`#ff0000`) returns `'black'` – this is the correct WCAG result (5.25:1 vs 4:1 for white), even if white may look more natural.

## Platform compatibility
