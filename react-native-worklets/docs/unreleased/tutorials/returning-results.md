# Returning results

In the [previous chapter](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/your-first-worklet) we dispatched some console logs to
other Runtimes. However, logging itself is not particularly useful.

In this chapter we'll learn how to obtain execution results from dispatched worklet functions.

## Synchronously

This is the simplest way of returning values. [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUISync) and
[`runOnRuntimeSync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeSync) functions return the result of a worklet
function directly to the invoking Runtime:

```js
import {
  createWorkletRuntime,
  runOnRuntimeSync,
  runOnUISync,
} from 'react-native-worklets';

function foo() {
  return 42;
}

const worker = createWorkletRuntime();
const uiResult = runOnUISync(foo);
const workerResult = runOnRuntimeSync(worker, foo);
console.log(uiResult, workerResult);
```

However, dispatching this calculation synchronously doesn't free the calling thread. We could
also call `foo` directly on the RN Runtime:

```js
function foo() {
  return 42;
}

const result = foo();
console.log(result);
```

Both the function and its caller execute on the JS thread and the result is immediately available.
To let the calling thread do other work while a calculation runs on another thread, we need an
asynchronous call. We'll explore when synchronous calls are useful in future sections.

## Asynchronously

For asynchronous returns, e.g. results of complex calculations, you can use
[`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUIAsync) and
[`runOnRuntimeAsync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeAsync) functions. They return an awaitable
promise.

Remember that [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnUI) and
[`scheduleOnRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnRuntime) functions do not return a value.

```js
import {
  createWorkletRuntime,
  getCurrentThreadId,
  runOnRuntimeAsync,
  runOnUIAsync,
} from 'react-native-worklets';
import { doImportantStuff } from './mocks';

function complexTask() {
  console.log(`computing on thread ${getCurrentThreadId()}`);
  const value = doImportantStuff();
  console.log('done');
  return value;
}

const worker = createWorkletRuntime();
const uiResult = runOnUIAsync(complexTask);
const result = runOnRuntimeAsync(worker, complexTask);
console.log('dispatched, RN Runtime keeps going');
const first = await uiResult;
const second = await result;
console.log(first, second);
```

The scheduling Runtime is free to keep executing JavaScript code until you await the returned
promise. In this example we dispatched the invocations of `complexTask` before awaiting, to execute them concurrently. While the RN Runtime awaits, its thread is free to run other tasks.

## With callbacks

Often, we'll want to return a value through a callback, e.g. to update our app's React state based on the result of a worklet function executed on another Worklet Runtime. You might be tempted to
write something like this:

```js
import { createWorkletRuntime, scheduleOnRuntime } from 'react-native-worklets';
import { useState } from 'react';
import { doImportantStuff } from './mocks';

function Component() {
  const [state, setState] = useState(0);
  const worker = createWorkletRuntime({ name: 'worker' });
  function task() {
    const result = doImportantStuff();
    setState(result); // This call crashes on the Worker Runtime.
  }
  scheduleOnRuntime(worker, task);
  return null;
}
```

The worker calculates `result`, but stops when it tries to call `setState(result)`.
The state setter belongs to the RN Runtime. Passing it to the Worker Runtime gives that Runtime a reference to the callback, not a function it can invoke directly.

The console shows the Worklets error format. The function and Runtime names in your app may differ.

We have to dispatch it back to the RN Runtime with the [`scheduleOnRN`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnRN) function.

```js
import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
} from 'react-native-worklets';
import { doImportantStuff } from './mocks';

function setState(value) {
  console.log(`state = ${value}`);
}

function task() {
  const result = doImportantStuff();
  scheduleOnRN(setState, result);
}

const worker = createWorkletRuntime();
scheduleOnRuntime(worker, task);
```

Alternatively, you can use a promise and the `runOnRuntimeAsync` function:

```js
import { createWorkletRuntime, runOnRuntimeAsync } from 'react-native-worklets';
import { doImportantStuff } from './mocks';

function setState(value) {
  console.log(`state = ${value}`);
}

function task() {
  const result = doImportantStuff();
  return result;
}

const worker = createWorkletRuntime();
runOnRuntimeAsync(worker, task).then((result) => setState(result));
```

Now that we know how to return values, in the next chapter we'll learn how to use a Worklet Runtime's event loop.
