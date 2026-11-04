# isUIRuntime

Checks if the current runtime is the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#ui-runtime).

## Reference

```js
import {
  isUIRuntime,
  createWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
} from 'react-native-worklets';

function checkUI() {
  'worklet';
  console.log(isUIRuntime()); // true (UI Runtime)
}

function checkWorker() {
  'worklet';
  console.log(isUIRuntime()); // false (Worker Runtime)
}

console.log(isUIRuntime()); // false (RN Runtime)
scheduleOnUI(checkUI);
const workerRuntime = createWorkletRuntime({ name: 'background' });
scheduleOnRuntime(workerRuntime, checkWorker);
```

Type definitions

```typescript
function isUIRuntime(): boolean;
```

### Returns

`true` if the current runtime is the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#ui-runtime), `false` otherwise.

## Remarks

* The function checks the value of `globalThis.__RUNTIME_KIND` to determine the kind of the current runtime. See [getRuntimeKind](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/getRuntimeKind) for more details.
