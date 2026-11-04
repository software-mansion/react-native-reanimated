# runOnRuntimeSyncWithId

`runOnRuntimeSyncWithId` is a variant of [runOnRuntimeSync](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeSync) where you use the runtime's id instead of the runtime object. It's useful when you don't have access to the runtime object, but you know its id.

## Reference

```js
import {
  createWorkletRuntime,
  runOnRuntimeSyncWithId,
} from 'react-native-worklets';

function compute() {
  'worklet';
  return 2 + 2;
}

const workletRuntime = createWorkletRuntime({ name: 'background' });
// Blocks the calling thread until the worklet finishes.
const result = runOnRuntimeSyncWithId(
  workletRuntime.runtimeId,
  compute
);
console.log(result); // 4
```

Type definitions

```typescript
function runOnRuntimeSyncWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;
```

## Arguments

### runtimeId

The id of the [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime) to run the worklet function on. You can get the id from the runtime object by accessing its `runtimeId` property.

### worklet

A reference to a function you want to execute on the [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime).

### args

Arguments to the function you want to execute on the [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime).

## Remarks

* `runOnRuntimeSyncWithId` can target the UI Runtime by passing [UIRuntimeId](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/uiRuntimeId) as the runtime id.

## Call table

| Mode             | RN Runtime | UI Runtime    | Worker Runtime |
| ---------------- | ---------- | ------------- | -------------- |
| Bundle Mode      | Supported  | Supported     | Supported      |
| Legacy Eval Mode | Supported  | Not supported | Not supported  |

## Platform compatibility

| Native    | Web           |
| --------- | ------------- |
| Supported | Not supported |
