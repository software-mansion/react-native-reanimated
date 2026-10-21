# withRepeat

`withRepeat` is an [animation modifier](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-modifier) that lets you repeat an animation given number of times or run it indefinitely.

## Reference

```javascript
import { withRepeat } from 'react-native-reanimated';

function App() {
  sv.value = withRepeat(withSpring(0), 5);
  // ...
}
```

Type definitions

```typescript
type AnimatableValue = number | string | number[];

function withRepeat<T extends AnimatableValue>(
  animation: T,
  numberOfReps?: number,
  reverse?: boolean,
  callback?: (finished?: boolean, current?: AnimatableValue) => void,
  reduceMotion?: ReduceMotion
): T;

enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}
```

### Arguments

#### `animation`

An [animation object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object) you want to repeat.

#### `numberOfReps`&#x20;

The number of times the animation is going to be repeated. Defaults to `2`.

A non-positive value (e.g. `0` or `-1`) will cause the animation to repeat indefinitely until it is cancelled or torn down. For example, if the component unmounts or [`cancelAnimation`](https://docs.swmansion.com/react-native-reanimated/docs/core/cancelAnimation) was called.

#### `reverse`&#x20;

Whether the animation should run in reverse every other repetition. Defaults to `false`.

This option only supports [animation functions](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-function) (eg. [`withSpring`](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring)) and doesn't work with [animation modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-modifier) (eg. [`withSequence`](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSequence)).

#### `callback`&#x20;

A function called on animation complete. In case the animation is cancelled, the callback will receive `false` as the argument, otherwise it will receive `true`.

#### `reduceMotion`&#x20;

A parameter that determines how the animation responds to the device's reduced motion accessibility setting.

### Returns

`withRepeat` returns an [animation object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object) which holds the current state of the animation. It can be either assigned directly to a [shared value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) or can be used as a value for a style object returned from [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle).

## Example

## Remarks

* The callback passed to the 4th argument is automatically [workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize) and ran on the [UI thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread).

## Platform compatibility
