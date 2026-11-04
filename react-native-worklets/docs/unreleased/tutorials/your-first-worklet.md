# Your first worklet function

In this chapter we'll learn the basics of dispatching your JavaScript code to
[Worklet Runtimes](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime) to execute in parallel, using
worklet
functions. We strongly recommend reading about the [concurrency model](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/concurrency-model) before continuing.

## Creating a Worklet Runtime

To actually dispatch some multithreading work, we need another Worklet Runtime as a target. We can
either use the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#ui-runtime) which is always available,
or create our own [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime) with the [`createWorkletRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/createWorkletRuntime) function.

```js
import { createWorkletRuntime } from 'react-native-worklets';

const worker = createWorkletRuntime({ name: 'background' });
```

In the next steps we'll dispatch some work to our new Worker Runtime and the UI Runtime.

## Asynchronous execution

Let's start small by dispatching functions that perform only a `console.log` on different Runtimes. We'll print the TID (platform-specific thread id) of the executing thread too, to show
that they are indeed dispatched to different threads, with the [`getCurrentThreadId`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/getCurrentThreadId) function. This function returns the result
of [`std::this_thread::get_id`](https://en.cppreference.com/w/cpp/thread/get_id).

We'll use [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnUI) to dispatch to the UI Runtime and
[`scheduleOnRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnRuntime) to dispatch to the Worker Runtime. These
functions are fire-and-forget style — they return immediately after dispatching the worklet
function, without waiting for it to complete, and do not yield any result.

```js
import {
  createWorkletRuntime,
  getCurrentThreadId,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

function logTid() {
  'worklet';
  console.log(getCurrentThreadId());
}

const worker = createWorkletRuntime();
logTid();
scheduleOnUI(logTid);
scheduleOnRuntime(worker, logTid);
```

The logs show a different TID for each call, because we dispatched the worklet function to different threads.

## Synchronous execution

Sometimes you might want to execute a worklet function synchronously, from the same thread, but on another Runtime. For that purpose, the Worklets library exposes
[`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUISync) and
[`runOnRuntimeSync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeSync) functions. These functions are blocking — they
return only after the worklet function has completed. If a different thread is currently using the Runtime, these functions wait for the target Runtime to be released before executing the worklet function.

```js
import {
  createWorkletRuntime,
  getCurrentThreadId,
  runOnRuntimeSync,
  runOnUISync,
} from 'react-native-worklets';

function logTid() {
  'worklet';
  console.log(getCurrentThreadId());
}

const worker = createWorkletRuntime();
logTid();
runOnUISync(logTid);
runOnRuntimeSync(worker, logTid);
```

All three logs show the same TID, because no thread hopping was involved.

Knowing when to delegate something asynchronously and when to do it synchronously is the difference
between a smooth user experience and a bad one. The rule of thumb is that **if the operation is not
critical for the UI, it should be dispatched asynchronously.**

## Passing arguments

If the worklet function you want to call takes arguments, you have to pass them as extra arguments to the scheduling function.

```js
import {
  createWorkletRuntime,
  getCurrentThreadId,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

function logMessage(message) {
  'worklet';
  console.log(`${message} from thread ${getCurrentThreadId()}`);
}

const worker = createWorkletRuntime();
scheduleOnUI(logMessage, 'Hello');
scheduleOnRuntime(worker, logMessage, 'Hi');
```

## Autoworkletization

In previous code snippets we always marked worklet functions with the `'worklet'` directive.
However, in most cases you can omit the directive. The Worklets plugin
[automatically detects](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/about#autoworkletization) which functions should
be treated as worklet functions and applies the transformation regardless. Both versions below work
the same:

```js title="With the directive"
function logTid() {
  'worklet';
  console.log(getCurrentThreadId());
}

scheduleOnUI(logTid);
```

```js title="Without the directive"
function logTid() {
  console.log(getCurrentThreadId());
}

scheduleOnUI(logTid);
```

In future examples, we will omit the directive whenever possible.

In the next chapter, we'll learn how to return results from
worklet functions.
