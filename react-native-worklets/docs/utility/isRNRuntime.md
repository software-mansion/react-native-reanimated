# isRNRuntime

Checks if the current runtime is the [React Native Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#rn-runtime).

## Reference

```typescript
import {
  isRNRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
  createWorkletRuntime,
} from 'react-native-worklets';

// highlight-next-line
console.log(isRNRuntime()); // true

scheduleOnUI(() => {
  console.log(isRNRuntime()); // false
});

const workerRuntime = createWorkletRuntime();
scheduleOnRuntime(workerRuntime, () => {
  console.log(isRNRuntime()); // false
});
```

Type definitions

```typescript
function isRNRuntime(): boolean;
```

### Returns

`true` if the current runtime is the RN Runtime, `false` otherwise.

## Remarks

* The function checks the value of `globalThis.__RUNTIME_KIND` to determine the kind of the current runtime. See [getRuntimeKind](https://docs.swmansion.com/react-native-worklets/docs/utility/getRuntimeKind) for more details.
