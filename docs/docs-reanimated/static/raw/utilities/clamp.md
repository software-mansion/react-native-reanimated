# clamp

`clamp` lets you limit a value within a specified range.

## Reference

```jsx
import { clamp } from 'react-native-reanimated';

function App() {
  const result = clamp(sv.value, 0, 100);
}
```

Type definitions

```typescript
function clamp(value: number, min: number, max: number): number;
```

### Arguments

#### `value`

A number that will be returned as long as the provided value is in range between `min` and `max`.

#### `min`

A number which will be returned when provided `value` is lower than `min`.

#### `max`

A number which will be returned when provided `value` is higher than `max`.

### Returns

`clamp` returns a number between `min` and `max` bounds.

## Example

## Platform compatibility
