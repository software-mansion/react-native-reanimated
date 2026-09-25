# isWorkletRuntime

Checks if the current runtime is a [Worklet Runtime](/docs/concepts/runtimeKinds#worklet-runtime), either the [UI Runtime](/docs/concepts/runtimeKinds#ui-runtime) or a [Worker Runtime](/docs/concepts/runtimeKinds#worker-runtime).

## Reference

```typescript
import {
  isWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
  createWorkletRuntime,
} from 'react-native-worklets';

console.log(isWorkletRuntime()); // false

scheduleOnUI(() => {
  // highlight-next-line
  console.log(isWorkletRuntime()); // true
})();

const workerRuntime = createWorkletRuntime();
scheduleOnRuntime(workerRuntime, () => {
  // highlight-next-line
  console.log(isWorkletRuntime()); // true
})();
```

Type definitions

```typescript
function isWorkletRuntime(): boolean;
```

### Returns

`true` if the current runtime is a [Worklet Runtime](/docs/concepts/runtimeKinds#worklet-runtime), `false` otherwise.

## Remarks

* The function checks the value of `globalThis.__RUNTIME_KIND` to determine the kind of the current runtime. See [getRuntimeKind](/docs/utility/getRuntimeKind) for more details.
