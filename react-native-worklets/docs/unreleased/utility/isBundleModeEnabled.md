# isBundleModeEnabled

Checks whether [Bundle Mode](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode) is enabled.

For instructions on how to enable Bundle Mode, see the [Bundle Mode documentation](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode).

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

`true` if Bundle Mode is enabled, `false` otherwise (including in [Legacy Eval Mode](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode#legacy-eval-mode) and on the Web).
