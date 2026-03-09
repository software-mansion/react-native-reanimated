# withClamp

`withClamp` is an [animation modifier](/docs/fundamentals/glossary#animation-modifier) that lets you limit the scope of movement of your animation to make it stay within some predefined range.
Use it with [withSpring](/docs/animations/withSpring) animation.

## Reference

```javascript
import { withClamp } from 'react-native-reanimated';

function App() {
  sv.value = withClamp({ min: -1, max: 1 }, withSpring(0));
  // ...
}
```

Type definitions

```typescript
type AnimatableValue = number | string | number[];

function withClamp<T extends number | string>(
  config: {
    min?: T;
    max?: T;
  },
  clampedAnimation: T
): T;

enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}
```

### Arguments

#### `config`

An object with following properties:

| Name             | Type Description |
| ---------------- | ---------------- | ------------------------------------------------ |
| min  | `number`         | The lowest value your animation can ever reach   |
| max  | `number`         | The greatest value your animation can ever reach |

#### `animation`

The spring animation you want to clamp.

```typescript
const clampedStyleWithDelay = useAnimatedStyle(() => {
  return {
    width: withClamp({ min: 0, max: 100 }, withSpring(randomWidth.value)),
  };
});
```

### Returns

`withClamp` returns an [animation object](/docs/fundamentals/glossary#animation-object). It can be either assigned directly to a [shared value](/docs/fundamentals/glossary#shared-value) or can be used as a value for a style object returned from [useAnimatedStyle](/docs/core/useAnimatedStyle).
