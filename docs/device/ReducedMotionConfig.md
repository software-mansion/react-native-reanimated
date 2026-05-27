`ReducedMotionConfig` component let's you change behavior in response to the device's reduced motion accessibility setting. By default it disables all animation when the reduced motion is enabled on a device. You can adjust it for your specific use case. You can learn more about [Accessibility](/docs/guides/accessibility) and [`useReducedMotion`](/docs/device/useReducedMotion) in Reanimated.

> **Caution**
>
> The new configuration will be applied globally across the entire application.

## Reference

```javascript
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

function App() {
  return (
    // ...
    // highlight-next-line
    <ReducedMotionConfig mode={ReduceMotion.Never} />
    // ...
  );
}
```

Type definitions

```typescript
interface ReducedMotionConfigProps {
  mode: ReduceMotion;
}

enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}
```

### Arguments

#### `mode`

A parameter that determines how animations should behave in response to the device's reduce motion accessibility setting.

* `ReduceMotion.System` - This value adjusts the animation behavior based on whether the reduced motion accessibility setting is activated on the device. When enabled, the animation is disabled; otherwise, it remains active.
* `ReduceMotion.Always` - With this setting, the animation is consistently disabled, regardless of the device's accessibility configuration.
* `ReduceMotion.Never` - This option ensures that the animation remains enabled at all times.

## Example

## Platform compatibility
