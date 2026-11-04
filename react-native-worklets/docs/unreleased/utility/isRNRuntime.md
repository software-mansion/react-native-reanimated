# isRNRuntime

Checks if the current runtime is the [React Native Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#rn-runtime).

## Reference

```js
import {
  isRNRuntime,
  createWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
} from 'react-native-worklets';

function checkUI() {
  'worklet';
  console.log(isRNRuntime()); // false (UI Runtime)
}

function checkWorker() {
  'worklet';
  console.log(isRNRuntime()); // false (Worker Runtime)
}

console.log(isRNRuntime()); // true (RN Runtime)
scheduleOnUI(checkUI);
const workerRuntime = createWorkletRuntime({ name: 'background' });
scheduleOnRuntime(workerRuntime, checkWorker);
```

Type definitions

```typescript
function isRNRuntime(): boolean;
```

### Returns

`true` if the current runtime is the RN Runtime, `false` otherwise.

## Remarks

* The function checks the value of `globalThis.__RUNTIME_KIND` to determine the kind of the current runtime. See [getRuntimeKind](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/getRuntimeKind) for more details.
