# withSpring

`withSpring` lets you create spring-based animations.

## Reference

```javascript
import { withSpring } from 'react-native-reanimated';

function App() {
  sv.value = withSpring(0);
  // ...
}
```

Type definitions

```typescript
type AnimatableValue = number | string | number[];

export type SpringConfig = {
  mass?: number;
  overshootClamping?: boolean;
  energyThreshold?: number;
  velocity?: number;
  reduceMotion?: ReduceMotion;
} & (
  | {
      stiffness?: number;
      damping?: number;
      duration?: never;
      dampingRatio?: never;
      clamp?: never;
    }
  | {
      stiffness?: never;
      damping?: never;
      duration?: number;
      dampingRatio?: number;
      clamp?: { min?: number; max?: number };
    }
);

function withSpring<T extends AnimatableValue>(
  toValue: T,
  config?: WithSpringConfig,
  callback?: (finished?: boolean, current?: AnimatableValue) => void
): T;

enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}
```

### Arguments

#### `toValue`

#### `config`&#x20;

The spring animation configuration.

Available for physics-based spring:

| Name                   | Type     | Default | Description                                                                                |
| ---------------------- | -------- | ------- | ------------------------------------------------------------------------------------------ |
| damping    | `number` | 120     | How quickly a spring slows down. Higher damping means the spring will come to rest faster. |
| stiffness  | `number` | 900     | How bouncy the spring is.                                                                  |

Available for duration-based spring:

| Name                      | Type     | Default | Description                                                                                                                                                          |
| ------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duration      | `number` | 550     | Perceptual duration of the animation in milliseconds. Actual duration is 1.5 times the value of perceptual duration.                                                 |
| dampingRatio  | `number` | 1       | How damped the spring is. Value `1` means the spring is critically damped, value `>1` means the spring is overdamped and value `<1` means the spring is underdamped. |

> **Info**
>
> The `stiffness` and `damping` (physics-based) properties can't be used at the same time as `duration` and `dampingRatio` (duration-based).
>
> When used together `duration` and `dampingRatio` overrides `stiffness` and `damping` props.

Available for every spring animation:

| Name                           | Type               | Default               | Description                                                                                                                                   |
| ------------------------------ | ------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| mass               | `number`           | 4                     | The weight of the spring. Reducing this value makes the animation faster.                                                                     |
| velocity           | `number`           | 0                     | Initial velocity applied to the spring equation.                                                                                              |
| overshootClamping  | `boolean`          | false                 | Whether a spring can bounce over the `toValue`.                                                                                               |
| energyThreshold    | `number`           | 6e-9                  | Relative energy threshold below which the spring will snap without further oscillations.                                                      |
| reduceMotion       | `ReduceMotion`     | `ReduceMotion.System` | A parameter that determines how the animation responds to the device's reduced motion accessibility setting.                                  |
| clamp              | `[number, number]` | `undefined`           | Limit of the scope of movement. If your spring would exceed this limit, then `dampingRatio` will be reduced (to make the spring less bouncy). |

#### `callback`&#x20;

A function called upon animation completion. If the animation is cancelled, the callback will receive `false` as the argument; otherwise, it will receive `true`.

### Returns

`withSpring` returns an [animation object](/docs/fundamentals/glossary#animation-object) which holds the current state of the animation. It can be either assigned directly to a [shared value](/docs/fundamentals/glossary#shared-value) or can be used as a value for a style object returned from [useAnimatedStyle](/docs/core/useAnimatedStyle).

## Example

## Remarks

* The callback passed to the 3rd argument is automatically [workletized](/docs/fundamentals/glossary#to-workletize) and ran on the [UI thread](/docs/fundamentals/glossary#ui-thread).

## Platform compatibility
