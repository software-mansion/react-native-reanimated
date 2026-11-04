# Running worklet functions on the UI runtime

The Worklets library provides three functions for running a [worklet function](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/concurrency-model#worklet-functions) on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#ui-runtime) from the [RN Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#rn-runtime): [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnUI), [`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUIAsync) and [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUISync).
They differ in whether the worklet function runs asynchronously or synchronously, and in what they return to the caller.
Use the table below to pick the one that fits your case.

## Comparison

|                 | [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnUI) | [`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUIAsync) | [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUISync) |
| --------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Execution**   | Asynchronous                                                                                              | Asynchronous                                                                                              | Synchronous, blocks the caller until the worklet function returns                                       |
| **Returns**     | Nothing                                                                                                   | A `Promise` that resolves with the worklet function's return value                                        | The worklet function's return value directly                                                            |
| **Web support** | ✅                                                                                                         | ✅                                                                                                         | ❌                                                                                                       |
| **Use when**    | You want to run a worklet function on the UI Runtime and don't need its result back                       | You need the worklet function's result back, but don't want to block the calling thread                   | You need the worklet function's result immediately, within the same synchronous flow                    |

The values returned by `runOnUIAsync` and `runOnUISync` have to be [serializable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable).

All three functions can be called from the [RN Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#rn-runtime), and additionally from the [UI](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#ui-runtime) and [Worker](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime) Runtimes when [Bundle Mode](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode) is enabled.
See [Call tables](https://docs.swmansion.com/react-native-worklets/docs/unreleased/guides/call-tables) for the full matrix.

## Watch the execution

### Schedule work without waiting

The UI thread runs the callback while the JS thread continues with the next line.

```js
import { scheduleOnUI } from 'react-native-worklets';

function myFunction() {
  'worklet';
  console.log('Hello from the UI Runtime!');
}

scheduleOnUI(myFunction);
console.log('The RN Runtime continues');
```

### Await a result

The callback runs on the UI thread. Awaiting its Promise suspends this function; the JS thread remains available for other queued work.

```js
import { runOnUIAsync } from 'react-native-worklets';

function compute() {
  'worklet';
  return 1;
}

const pending = runOnUIAsync(compute);
console.log('The RN Runtime continues while the result is pending');
const result = await pending;
console.log(result); // 1
```

### Read a result synchronously

The calling JS thread acquires the UI Runtime and executes the callback itself. It resumes the next line only after the result is ready.

```js
import { runOnUISync } from 'react-native-worklets';

function myFunction(num) {
  'worklet';
  return num + 1;
}

const result = runOnUISync(myFunction, 0);
console.log(result); // 1
```
