# UIRuntimeId

The value of the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime)'s id. Each [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worklet-runtime) has a unique id that can be used to target it from functions like [runOnRuntimeSyncWithId](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnRuntimeSyncWithId) and [scheduleOnRuntimeWithId](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRuntimeWithId) or to host [Shareables](https://docs.swmansion.com/react-native-worklets/docs/memory/shareable) on it with [createShareable](https://docs.swmansion.com/react-native-worklets/docs/memory/createShareable).

## Reference

```javascript
import { UIRuntimeId } from 'react-native-worklets';

console.log(UIRuntimeId); // 2
```

Type definitions

```typescript
const UIRuntimeId: number;
```
