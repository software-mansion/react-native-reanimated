# runOnRuntimeSync

`runOnRuntimeSync` lets you run a [workletized](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/about#autoworkletization) function synchronously on a [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime). It's blocking - meaning that it can preempt the runtime from a thread that's currently executing it.

## Reference

```js
import { createWorkletRuntime, runOnRuntimeSync } from 'react-native-worklets';

function compute() {
  'worklet';
  return 2 + 2;
}

const workletRuntime = createWorkletRuntime({ name: 'background' });
// Blocks the calling thread until the worklet finishes.
const result = runOnRuntimeSync(workletRuntime, compute);
console.log(result); // 4
```

Type definitions

```typescript
function runOnRuntimeSync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;
```

## Arguments

### workletRuntime

The worklet runtime to run the worklet function on.

### worklet

A reference to a function you want to execute on the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

### args

Arguments to the function you want to execute on the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

## Call table

| Mode             | RN Runtime | UI Runtime    | Worker Runtime |
| ---------------- | ---------- | ------------- | -------------- |
| Bundle Mode      | Supported  | Supported     | Supported      |
| Legacy Eval Mode | Supported  | Not supported | Not supported  |

## Platform compatibility

| Native    | Web           |
| --------- | ------------- |
| Supported | Not supported |
