# runOnRuntimeAsync

`runOnRuntimeAsync` lets you asynchronously run [worklet functions](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/concurrency-model#worklet-functions) on a [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).
It returns a Promise of the worklet function's return value. The Promise is resolved asynchronously, not immediately after the callback execution.

## Reference

```js
import { createWorkletRuntime, runOnRuntimeAsync } from 'react-native-worklets';

function sum(numbers) {
  'worklet';
  return numbers.reduce((total, n) => total + n, 0);
}

const workletRuntime = createWorkletRuntime({ name: 'background' });
const data = [1, 2, 3, 4];
const pending = runOnRuntimeAsync(workletRuntime, sum, data);
console.log('The RN Runtime continues while the worker computes');
const result = await pending;
console.log('Computation result:', result); // 10
```

Type definitions

```typescript
function runOnRuntimeAsync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue>;
```

## Arguments

### workletRuntime

The worklet runtime to run the worklet function on. Created with [`createWorkletRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/createWorkletRuntime).

### worklet

A reference to a function you want to execute on the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime). Arguments to your function have to be passed after the worklet function i.e. `runOnRuntimeAsync(workletRuntime, setValue, 10);`.

### args

Arguments to the function you want to execute on the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

## Remarks

* It's a common mistake to execute function inside of `runOnRuntimeAsync` like this: ~~`runOnRuntimeAsync(workletRuntime, myWorklet(10))`~~. Here, the correct usage would be `runOnRuntimeAsync(workletRuntime, myWorklet, 10)`.

* The callback passed as the argument is automatically [workletized](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/about#autoworkletization) and ready to be run on the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

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
