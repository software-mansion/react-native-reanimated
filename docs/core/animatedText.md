# Animated.Text

`Animated.Text` is a built-in [Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component) based on the React Native `Text`. Besides animating its styles and props, since Reanimated 4.8.0 it accepts [shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) as children. The text is updated on the UI thread, without re-rendering the component.

## Reference

```javascript
import Animated, { useSharedValue } from 'react-native-reanimated';

function App() {
  const count = useSharedValue(0);

  return <Animated.Text>{count}</Animated.Text>;
}
```

Type definitions

```typescript
type AnimatedTextChild =
  | ReactNode
  | Omit<SharedValue<string | number | null | undefined>, 'set' | 'modify'>;

type AnimatedTextProps = Omit<AnimatedProps<TextProps>, 'children'> & {
  children?: AnimatedTextChild | AnimatedTextChild[];
};
```

### Props

`Animated.Text` accepts all props of the React Native `Text` component, and every style and prop can be animated the same way as in other Animated components.

#### `children`

A shared value, a derived value, or any children supported by `Text`. Shared values can be mixed with static children in a single `Animated.Text`:

```jsx
<Animated.Text>Progress: {progress}%</Animated.Text>
```

A shared value used as a child has to hold a `string`, a `number`, `null` or `undefined`. Other types, like `boolean`, objects and arrays, are rejected by TypeScript.

## Example

## Remarks

* Pass the shared value itself as a child. Don't read its `value` property during render, as in `<Animated.Text>{progress.value}</Animated.Text>`. Reading `value` during render is a side effect, it blocks the JavaScript thread until the value is fetched from the UI thread, and the text becomes a static snapshot that never updates. See [`useSharedValue`](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue#remarks) for more details.

  ```jsx
  // 🚨 reads the value during render, the text doesn't update
  <Animated.Text>{progress.value}</Animated.Text>

  // ✅ the text follows the shared value
  <Animated.Text>{progress}</Animated.Text>
  ```

* A `null`, `undefined` or empty string value renders an empty text. Reanimated keeps the `Text` from collapsing by rendering a zero-width space in its place.

* A number is converted to a string, so use [`useDerivedValue`](https://docs.swmansion.com/react-native-reanimated/docs/core/useDerivedValue) to format it, for example to round it or to add a unit.

* `Animated.Text` doesn't update shared value children when the [`USE_ANIMATION_BACKEND`](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags) static feature flag is enabled.

## Platform compatibility
