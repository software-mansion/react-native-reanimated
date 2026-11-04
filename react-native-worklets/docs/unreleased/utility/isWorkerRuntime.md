# isWorkerRuntime

Checks if the current runtime is a [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

## Reference

```js
import {
  isWorkerRuntime,
  createWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
} from 'react-native-worklets';

function checkUI() {
  'worklet';
  console.log(isWorkerRuntime()); // false (UI Runtime)
}

function checkWorker() {
  'worklet';
  console.log(isWorkerRuntime()); // true (Worker Runtime)
}

console.log(isWorkerRuntime()); // false (RN Runtime)
scheduleOnUI(checkUI);
const workerRuntime = createWorkletRuntime({ name: 'background' });
scheduleOnRuntime(workerRuntime, checkWorker);
```

Type definitions

```typescript
function isWorkerRuntime(): boolean;
```

### Returns

`true` if the current runtime is the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime), `false` otherwise.

## Remarks

* The function checks the value of `globalThis.__RUNTIME_KIND` to determine the kind of the current runtime. See [getRuntimeKind](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/getRuntimeKind) for more details.
