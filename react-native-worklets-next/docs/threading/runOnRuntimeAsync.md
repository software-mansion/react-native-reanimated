# runOnRuntimeAsync

`runOnRuntimeAsync` lets you asynchronously run [worklet functions](/docs/tutorials/concurrency-model#worklet-functions) on a [Worker Runtime](/docs/concepts/runtimeKinds#worker-runtime).
It returns a Promise of the worklet function's return value. The Promise is resolved asynchronously, not immediately after the callback execution.

## Reference

```javascript
import { runOnRuntimeAsync, createWorkletRuntime } from 'react-native-worklets';

const backgroundRuntime = createWorkletRuntime({ name: 'background' });

async function performHeavyComputation(data: number[]) {
  try {
    const result = await runOnRuntimeAsync(backgroundRuntime, (numbers: number[]) => {
      'worklet';
      // Heavy computation on background thread
      return numbers.reduce((sum, n) => sum + n, 0);
    }, data);

    console.log('Computation result:', result);
  } catch (error) {
    console.error('Computation failed:', error);
  }
}
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

The worklet runtime to run the worklet function on. Created with [`createWorkletRuntime`](/docs/threading/createWorkletRuntime).

### worklet

A reference to a function you want to execute on the [Worker Runtime](/docs/concepts/runtimeKinds#worker-runtime). Arguments to your function have to be passed after the worklet function i.e. `runOnRuntimeAsync(workletRuntime, setValue, 10);`.

### args

Arguments to the function you want to execute on the [Worker Runtime](/docs/concepts/runtimeKinds#worker-runtime).

## Remarks

* It's a common mistake to execute function inside of `runOnRuntimeAsync` like this: ~~`runOnRuntimeAsync(workletRuntime, myWorklet(10))`~~. Here, the correct usage would be `runOnRuntimeAsync(workletRuntime, myWorklet, 10)`.

* The callback passed as the argument is automatically [workletized](/docs/worklets-plugin/about#autoworkletization) and ready to be run on the [Worker Runtime](/docs/concepts/runtimeKinds#worker-runtime).

* Errors thrown in the worklet function will cause the Promise to reject with that error.

## Call table

## Platform compatibility
