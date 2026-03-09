`LayoutAnimationConfig` is a component that lets you skip entering and exiting animations.

## Reference

```javascript
import { LayoutAnimationConfig } from 'react-native-reanimated';

function App() {
  const [show, setShow] = React.useState(true);

  return (
    // highlight-next-line
    <LayoutAnimationConfig skipEntering>
      <View>
        {show && <Animated.View entering={PinwheelIn} exiting={PinwheelOut} />}
      </View>
      // highlight-next-line
    </LayoutAnimationConfig>
  );
}
```

Type definitions

```typescript
interface LayoutAnimationConfigProps {
  skipEntering?: boolean;
  skipExiting?: boolean;
  children: ReactNode;
}
```

### Arguments

#### `skipEntering`&#x20;

A boolean indicating whether children's entering animations should be skipped when `LayoutAnimationConfig` is mounted.

#### `skipExiting`&#x20;

A boolean indicating whether children's exiting animations should be skipped when `LayoutAnimationConfig` is unmounted.

## Example

## Remarks

* You can nest the `LayoutAnimationConfig` component if you want to disable animations on a smaller subset of components.

* If you are working with a `FlatList` and want to skip animations in items when the list is mounted and unmounted you can use `skipEnteringExitingAnimations`. This prop automatically wraps your `FlatList` with `<LayoutAnimationConfig skipEntering skipExiting>`.

## Platform compatibility
