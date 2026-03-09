# useAnimatedRef

`useAnimatedRef` lets you get a reference of a view. Used alongside [`measure`](/docs/advanced/measure), [`scrollTo`](/docs/scroll/scrollTo), and [`useScrollOffset`](/docs/scroll/useScrollOffset) functions.

You need to pass the object defined using `useAnimatedRef` to the `ref` property of a component.

## Reference

```jsx
import { useAnimatedRef } from 'react-native-reanimated';

function App() {
  const animatedRef = useAnimatedRef();

  return <Animated.View ref={animatedRef} />;
}
```

Type definitions

```typescript
function useAnimatedRef<T extends Component>(): AnimatedRef<T>;
```

### Arguments

`useAnimatedRef` doesn't take any arguments.

### Returns

`useAnimatedRef` returns an object with a `current` property which contains an instance of a component.

## Example

## Remarks

* You can use `useAnimatedRef` to reference not only the Animated versions of components, but any React Native component.

* The value stored in the current property becomes available after the component is mounted.

```jsx
function App() {
  const animatedRef = useAnimatedRef();

  console.log(animatedRef.current); // 🚩 Returns null

  useEffect(() => {
    console.log(animatedRef.current); // ✅ Returns the component
  }, []);

  return <View ref={animatedRef} />;
}
```

Alternatively, you can get the value stored in the `current` in [event handlers](https://react.dev/learn/responding-to-events) or in a `onLayout` property.

* The value stored in the `current` property isn't available on the [UI thread](/docs/fundamentals/glossary#ui-thread).

## Platform compatibility
