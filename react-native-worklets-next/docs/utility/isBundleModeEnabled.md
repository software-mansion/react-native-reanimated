# isBundleModeEnabled

Checks whether [Bundle Mode](/docs/bundleMode) is enabled.

For instructions on how to enable Bundle Mode, see the [Bundle Mode documentation](/docs/bundleMode).

## Reference

```typescript
import { isBundleModeEnabled } from 'react-native-worklets';

console.log(isBundleModeEnabled()); // true if Bundle Mode is enabled
```

Type definitions

```typescript
function isBundleModeEnabled(): boolean;
```

### Returns

`true` if Bundle Mode is enabled, `false` otherwise (including in [Legacy Eval Mode](/docs/bundleMode#legacy-eval-mode) and on the Web).
