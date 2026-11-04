# runOnRuntimeAsyncWithId

`runOnRuntimeAsyncWithId` is a variant of [runOnRuntimeAsync](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeAsync) where you use the runtime's id instead of the runtime object. It's useful when you don't have access to the runtime object, but you know its id.

## Reference

```js
import {
  createWorkletRuntime,
  runOnRuntimeAsyncWithId,
} from 'react-native-worklets';

function sum(numbers) {
  'worklet';
  return numbers.reduce((total, n) => total + n, 0);
}

const workletRuntime = createWorkletRuntime({ name: 'background' });
const data = [1, 2, 3, 4];
const pending = runOnRuntimeAsyncWithId(
  workletRuntime.runtimeId,
  sum,
  data
);
console.log('The RN Runtime continues while the worker computes');
const result = await pending;
console.log('Computation result:', result); // 10
```

Type definitions

```typescript
function runOnRuntimeAsyncWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue>;
```

## Arguments

### runtimeId

The id of the [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime) to run the worklet function on. You can get the id from the runtime object by accessing its `runtimeId` property.

### worklet

A reference to a function you want to execute on the [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime).

### args

Arguments to the function you want to execute on the [Worklet Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime).

## Remarks

* `runOnRuntimeAsyncWithId` can target the UI Runtime by passing [UIRuntimeId](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/uiRuntimeId) as the runtime id.

* Errors thrown in the worklet function will cause the Promise to reject with that error.

## Call table

| Mode             | RN Runtime | UI Runtime    | Worker Runtime |
| ---------------- | ---------- | ------------- | -------------- |
| Bundle Mode      | Supported  | Supported     | Supported      |
| Legacy Eval Mode | Supported  | Not supported | Not supported  |

## Platform compatibility

| Native    | Web           |
| --------- | ------------- |
| Supported | Not supported |
