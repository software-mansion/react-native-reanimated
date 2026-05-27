# isUIRuntime

Checks if the current runtime is the [UI Runtime](/docs/fundamentals/runtimeKinds#ui-runtime).

## Reference

```typescript
import {
  isUIRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
  createWorkletRuntime,
} from 'react-native-worklets';

console.log(isUIRuntime()); // false

scheduleOnUI(() => {
  // highlight-next-line
  console.log(isUIRuntime()); // true
})();

const workerRuntime = createWorkletRuntime();
scheduleOnRuntime(workerRuntime, () => {
  console.log(isUIRuntime()); // false
})();
```

Type definitions

```typescript
function isUIRuntime(): boolean;
```

### Returns

`true` if the current runtime is the [UI Runtime](/docs/fundamentals/runtimeKinds#ui-runtime), `false` otherwise.

## Remarks

* The function checks the value of `globalThis.__RUNTIME_KIND` to determine the kind of the current runtime. See [getRuntimeKind](/docs/utility/getRuntimeKind) for more details.
