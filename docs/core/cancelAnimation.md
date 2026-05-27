# cancelAnimation

`cancelAnimation` lets you cancel a running animation paired to a [shared value](/docs/fundamentals/glossary#shared-value).

## Reference

```javascript
import { cancelAnimation } from 'react-native-reanimated';

function App() {
  const offset = useSharedValue(100);

  const handleCancel = () => {
    // highlight-next-line
    cancelAnimation(offset);
  };
}
```

Type definitions

```typescript
type SharedValue<T> = { value: T };

function cancelAnimation<T>(sharedValue: SharedValue<T>): void;
```

### Arguments

#### `sharedValue`

The shared value of a running animation that you want to cancel. If no animation is running, the `cancelAnimation` function does nothing.

### Returns

`cancelAnimation` returns `undefined`.

## Example

## Remarks

* You can resume the animation by assigning the same animation (i.e. `withSpring`, `withTiming`) to the shared value again.

## Platform compatibility
