# withSequence

`withSequence` is an [animation modifier](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-modifier) that lets you run animations in a sequence.

## Reference

```javascript
import { withSequence } from 'react-native-reanimated';

function App() {
  sv.value = withSequence(withTiming(50), withTiming(0));
  // ...
}
```

Type definitions

```typescript
type AnimatableValue = number | string | number[];

function withSequence<T extends AnimatableValue>(
  reduceMotion?: ReduceMotion,
  ...animations: [T, ...T[]]
): T;

enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}
```

### Arguments

#### `reduceMotion`&#x20;

A parameter that determines how the animation responds to the device's reduced motion accessibility setting.

#### `...animations`

Any number of [animation objects](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object) to be run in a sequence.

### Returns

`withSequence` returns an [animation object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object) which holds the current state of the animation. It can be either assigned directly to a [shared value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) or can be used as a value for a style object returned from [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle).

## Example

## Platform compatibility
