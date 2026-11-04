# isWorkletRuntime

Checks if the current runtime is a [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime), either the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#ui-runtime) or a [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

## Reference

```js
import {
  isWorkletRuntime,
  createWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
} from 'react-native-worklets';

function checkUI() {
  'worklet';
  console.log(isWorkletRuntime()); // true (UI Runtime)
}

function checkWorker() {
  'worklet';
  console.log(isWorkletRuntime()); // true (Worker Runtime)
}

console.log(isWorkletRuntime()); // false (RN Runtime)
scheduleOnUI(checkUI);
const workerRuntime = createWorkletRuntime({ name: 'background' });
scheduleOnRuntime(workerRuntime, checkWorker);
```

Type definitions

```typescript
function isWorkletRuntime(): boolean;
```

### Returns

`true` if the current runtime is a [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime), `false` otherwise.

## Remarks

* The function checks the value of `globalThis.__RUNTIME_KIND` to determine the kind of the current runtime. See [getRuntimeKind](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/getRuntimeKind) for more details.
