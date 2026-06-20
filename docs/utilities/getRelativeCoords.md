# getRelativeCoords

`getRelativeCoords` determines the location on the screen, relative to the given view.

## Reference

```tsx
import Animated, {
  getRelativeCoords,
  useAnimatedRef,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const Comp = () => {
  const animatedRef = useAnimatedRef();
  // ...

  const panGesture = Gesture.Pan().onEnd((event) => {
    const coords = getRelativeCoords(
      animatedRef,
      event.absoluteX,
      event.absoluteY
    );
    if (coords) {
      // use coords.x and coords.y
    }
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View ref={animatedRef} style={[styles.box]} />
    </GestureDetector>
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

An object which contains the relative coordinates, or `null` if the measurement fails.

* `x`
* `y`

### Example

## Platform compatibility
