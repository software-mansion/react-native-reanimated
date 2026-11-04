# Synchronizing data

In the [previous chapter](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/using-event-loop) we learned some theory about event
loops.

In this chapter, we'll put it to use and explore more advanced patterns of synchronizing data between JavaScript Runtimes,
where [asynchronous returns we learned previously](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/returning-results) wouldn't be sufficient.

## Getting the result of a periodic task

Previous examples showed us how to return the result of a single worklet function call at the point of
its invocation. What if we had a long-running task, yielding results continuously, but we wanted to
poll the data only occasionally?

```js
import { createWorkletRuntime, scheduleOnRuntime } from 'react-native-worklets';

const worker = createWorkletRuntime();

function taskDispatch() {
  let result = -1;
  function task() {
    result++;
  }
  setInterval(task, 16);
}

scheduleOnRuntime(worker, taskDispatch);
// How to access `result` here?
```

We'll explore how we can obtain the value of the local `result` variable and pass it to the RN Runtime.

## With callbacks — anti-pattern

We could use the same pattern as
[returning results with a callback](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/returning-results#with-callbacks).

```js
import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
} from 'react-native-worklets';

const worker = createWorkletRuntime();

let polledResult = -1;
function pollResult(value) {
  polledResult = value;
}

function taskDispatch() {
  let result = -1;
  function task() {
    result++;
    scheduleOnRN(pollResult, result);
  }
  setInterval(task, 16);
}

scheduleOnRuntime(worker, taskDispatch);

function synchronize() {
  console.log(polledResult);
}

setInterval(synchronize, 80); // Only once in a while
```

**Do not do this!** This will schedule a cross-runtime call every 16 ms that updates our
`polledResult` value — even if we don't need it at the given moment. **For the best multithreading performance, minimize the number of cross-thread (cross-runtime) operations.**

## With the global object — anti-pattern

The simplest approach would be to store our result on the global object of the Worker Runtime.

Then poll it with another function call, either synchronously or asynchronously:

```js
import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  runOnRuntimeSync,
  scheduleOnRuntime,
} from 'react-native-worklets';

const worker = createWorkletRuntime();

function taskDispatch() {
  globalThis.result = -1;
  function task() {
    globalThis.result++;
  }
  setInterval(task, 16);
}

scheduleOnRuntime(worker, taskDispatch);

function poll() {
  console.log('polling');
  return globalThis.result;
}
async function synchronize() {
  const asyncResult = runOnRuntimeAsync(worker, poll);
  const syncResult = runOnRuntimeSync(worker, poll);
  console.log('sync:', syncResult);
  const value = await asyncResult;
  console.log('async:', value);
}

setInterval(synchronize, 80); // Only once in a while
```

However, this code doesn't scale well if we want to synchronize with multiple variables. It's
generally a bad practice to use the global object like this. It's still better than the previous
anti-pattern, but please **use it as a last resort escape hatch.**

## With a Synchronizable

A [Synchronizable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable) is a memory primitive in the Worklets library that lives outside of any Runtime's JavaScript heap. Reading it and writing to it doesn't require making a cross-runtime call and is the cheapest option for synchronizing data between Runtimes.

You can find detailed documentation for the Synchronizable in its
[API reference](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable), but for the sake of this example we'll stick to its
`getDirty`
and `setBlocking` methods. The `getDirty` method simply returns the value of the Synchronizable, without
waiting for any
transactions on it to complete. It's safe to use it here as we don't care about reading the value
mid-transaction.
The `setBlocking` method updates the value atomically, blocking other writers from modifying it until
the transaction is complete.

```js
import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRuntime,
} from 'react-native-worklets';

const worker = createWorkletRuntime();
const result = createSynchronizable(-1);

function taskDispatch() {
  function task() {
    result.setBlocking((value) => value + 1);
  }
  setInterval(task, 16);
}

scheduleOnRuntime(worker, taskDispatch);

function synchronize() {
  console.log(result.getDirty());
}

setInterval(synchronize, 80); // Only once in a while
```

Even though the Synchronizable was created on the RN Runtime, the value actually lives in the native
heap and both Runtimes (threads) can access it with little overhead and without excessively blocking one
another.

For this simple case, we can even optimize our code further and use a
[Synchronizable with a fixed type](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable#synchronizable-fixed),
which exposes the `setDirty` method and is generally faster than a general
[Synchronizable with a dynamic type](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable#synchronizable-dynamic)
that we just used. A fixed-type Synchronizable holds a raw value instead of a general [Serializable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable) on the native heap.

```js
import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRuntime,
} from 'react-native-worklets';

const worker = createWorkletRuntime();
const result = createSynchronizable(-1, { fixedType: true });

function taskDispatch() {
  let localResult = result.getDirty();
  function task() {
    localResult++;
    result.setDirty(localResult);
  }
  setInterval(task, 16);
}

scheduleOnRuntime(worker, taskDispatch);

function synchronize() {
  console.log(result.getDirty());
}

setInterval(synchronize, 80); // Only once in a while
```

This approach works best when you poll the data frequently or from multiple Runtimes at once.

The downside is that every call of `setDirty` or `setBlocking` has to cross the JavaScript–native boundary and store the value there. This is particularly costly when it comes to
storing non-primitive types, like objects or arrays, which require
[serialization](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable)
on each boundary crossing.

## With a Shareable

A [Shareable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/shareable) is another memory primitive, but, contrary to the Synchronizable, it lives on a designated Runtime, called the Host Runtime. Reading it on other Runtimes, called
Guest Runtimes,
means accessing it on its Host Runtime, either synchronously or asynchronously. It's similar in
principle to the [global object approach](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/synchronizing-data#with-the-global-object--anti-pattern), but with a layer
of useful
encapsulation.

Shareable is an *asymmetric* type, meaning it has a different structure on the Host Runtime and on
Guest Runtimes. On the Host Runtime, you can access the value it holds directly as its `value`
property. On Guest Runtimes you must use its synchronous or asynchronous methods.

To create a Shareable, we have to explicitly state the Host Runtime by its
[Runtime ID](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime).

```js
import {
  createShareable,
  createWorkletRuntime,
  scheduleOnRuntime,
} from 'react-native-worklets';

const worker = createWorkletRuntime();
const initialValue = -1;
const result = createShareable(worker.runtimeId, initialValue);

function taskDispatch() {
  function task() {
    result.value++;
  }
  setInterval(task, 16);
}

scheduleOnRuntime(worker, taskDispatch);

async function synchronize() {
  const syncResult = result.getSync();
  const asyncResult = result.getAsync();
  console.log('sync:', syncResult);
  const value = await asyncResult;
  console.log('async:', value);
}

setInterval(synchronize, 80); // Only once in a while
```

This approach works best when the Host Runtime reads and updates the value often and Guest Runtimes read it only once in a while.

## Mixing Shareables with Synchronizables

Shareables and Synchronizables are a powerful combination. A Synchronizable can keep
information about
the state of the Shareable, i.e. whether it has been updated, so the Guest Runtime can avoid reading
it if it
hasn't changed.

This is how [Reanimated Shared Values](https://docs.swmansion.com/reanimated/docs/shared-values) are
implemented.

A Shareable hosted on the UI Runtime stores the animation progress. When the RN
Runtime wants
to read the value to synchronize with the UI — e.g. for a component's first render — it checks a
Synchronizable flag, `needsSync`, attached to the Shared Value, to see if the UI Runtime has updated the value. If not,
it returns the last
read value, which was cached locally on the RN Runtime.

If the value has been updated — the `needsSync` flag is set — only then does the RN Runtime synchronously preempt the UI Runtime from the UI thread to read the value directly from the Host
Runtime. This whole flow is visualized by the simulation below.

```js
import {
  UIRuntimeId,
  createShareable,
  createSynchronizable,
  scheduleOnUI,
} from 'react-native-worklets';

const progress = createShareable(UIRuntimeId, 0);
const needsSync = createSynchronizable(false, { fixedType: true });
let cached = 0;

function onFrame(frame) {
  progress.value = frame * 25;
  needsSync.setDirty(true);
  if (frame < 4) {
    requestAnimationFrame(() => onFrame(frame + 1));
  }
}

function restartAnimation() {
  scheduleOnUI(onFrame, 0);
}

function refresh() {
  cached = progress.getSync();
  needsSync.setDirty(false);
  return cached;
}

function synchronize() {
  const changed = needsSync.getDirty();
  const value = changed ? refresh() : cached;
  console.log(`progress ${value}%${changed ? '' : ' (cached)'}`);
}

restartAnimation();
setInterval(restartAnimation, 160);
setInterval(synchronize, 24); // Read the progress on the RN Runtime once in a while
```

You might've noticed that the RN Runtime can read the `needsSync` flag in the tiny window when the UI Runtime has already updated the Shareable value but not yet the flag, so it reuses its cached result (lines 6-7 and 24-25). This is intended, as that example didn't aim for perfect synchronization.

If you want to avoid such tiny data races, you can lock the Synchronizable and perform a transaction instead. Do it only when you have to, as locking the Synchronizable like this is much more expensive than a plain `setDirty` call.

```js
import {
  UIRuntimeId,
  createShareable,
  createSynchronizable,
  scheduleOnUI,
} from 'react-native-worklets';

const progress = createShareable(UIRuntimeId, 0);
const needsSync = createSynchronizable(false, { fixedType: true });
let cached = 0;

function onFrame(frame) {
  needsSync.lock(); // lock for transaction
  progress.value = frame * 25;
  needsSync.setDirty(true);
  needsSync.unlock(); // unlock
  if (frame < 4) {
    requestAnimationFrame(() => onFrame(frame + 1));
  }
}

function restartAnimation() {
  scheduleOnUI(onFrame, 0);
}

function refresh() {
  needsSync.setBlocking(false);
  cached = progress.getSync();
  return cached;
}

function synchronize() {
  const changed = needsSync.getBlocking();
  const value = changed ? refresh() : cached;
  console.log(`progress ${value}%${changed ? '' : ' (cached)'}`);
}

restartAnimation();
setInterval(restartAnimation, 160);
setInterval(synchronize, 24); // Read the progress on the RN Runtime once in a while
```

Note that we also had to change the `getDirty` call in the `synchronize` function to `getBlocking` — otherwise we wouldn't respect the lock and could still read the intermediate value.

In a future tutorial, we'll learn how to integrate the Worklets library with C++ code.
