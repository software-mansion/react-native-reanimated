# withDelay

`withDelay` is an [animation modifier](/docs/fundamentals/glossary#animation-modifier) that lets you start an animation with a delay.

## Reference

```javascript
import { withDelay } from 'react-native-reanimated';

function App() {
  sv.value = withDelay(500, withTiming(0));
  // ...
}
```

Type definitions

```typescript
type AnimatableValue = number | string | number[];

function withDelay<T extends AnimatableValue>(
  delayMs: number,
  delayedAnimation: T,
  reduceMotion?: ReduceMotion
): T;

enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}
```

### Arguments

#### `delayMs`

Duration (in milliseconds) before the animation starts.

#### `delayedAnimation`

Animation to delay.

#### `reduceMotion`&#x20;

A parameter that determines how the animation responds to the device's reduced motion accessibility setting.

### Returns

`withDelay` returns an [animation object](/docs/fundamentals/glossary#animation-object) which holds the current state of the animation. It can be either assigned directly to a [shared value](/docs/fundamentals/glossary#shared-value) or can be used as a value for a style object returned from [useAnimatedStyle](/docs/core/useAnimatedStyle).

## Example

## Platform compatibility
