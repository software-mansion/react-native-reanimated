# getRelativeCoords

`getRelativeCoords` determines the location on the screen, relative to the given view.

## Reference

```tsx
import { getRelativeCoords } from 'react-native-reanimated';

const Comp = () => {
  const animatedRef = useAnimatedRef();
  // ...

  const gestureHandler = useAnimatedGestureHandler({
    onEnd: (event) => {
      const coords = getRelativeCoords(
        animatedRef,
        event.absoluteX,
        event.absoluteY
      );
    },
  });

  return (
    <View ref={animatedRef}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.box]} />
      </PanGestureHandler>
    </View>
  );
};
```

Type definitions

```typescript
function getRelativeCoords(
  animatedRef: AnimatedRef<Component>,
  absoluteX: number,
  absoluteY: number
): ComponentCoords | null;

interface ComponentCoords {
  x: number;
  y: number;
}
```

### Arguments

#### `animatedRef`

The product of [`useAnimatedRef`](/docs/core/useAnimatedRef) is Reanimated's extension of a standard React ref (delivers the view tag on the UI thread). This ref should be passed as a prop to the view relative to which we want to know coordinates.

#### `absoluteX`

Number which is an absolute `x` coordinate.

#### `absoluteY`

Number which is an absolute `y` coordinate.

### Returns

Object which contains relative coordinates

* `x`
* `y`

### Example

## Platform compatibility
