# Using the event loop

In the [previous chapter](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/returning-results) we learned how to return results from
dispatched worklet functions.

In this chapter we'll learn some theory about event loops, which you can use for more robust
applications of worklet functions.

## Event loops in React Native

The event loops in React Native are similar to the ones
[in the browser](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model).
All event loop functions, like `setTimeout` or `requestAnimationFrame`, are available on the
[RN Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#rn-runtime) and on
[Worklet Runtimes](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worklet-runtime), but they can behave slightly
differently depending on the context.

## RN Runtime

The RN Runtime's event loop is handled solely by the
[RN JS thread](https://reactnative.dev/architecture/threading-model). This means that, unlike in the browser, this Runtime's event loop *is not tied to the native rendering layer* and
[`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) queue is polyfilled with a periodic timer.

However, the execution of the `requestAnimationFrame` queue is synced with the display's refresh rate, a technique known as [vertical synchronization](https://en.wikipedia.org/wiki/Vertical_synchronization) (vsync). With an idle JS thread, the queue runs once per native frame.

This is the optimistic case. When the JS thread is busy, it cannot keep up and gets out of sync: it skips frames and then might flush the queue more often to catch up with the UI thread.

**The application UI will not wait for the current iteration of the RN Runtime's `requestAnimationFrame` queue
execution to finish when rendering a frame.**

In this recording, not only were there fewer JS thread frames than UI frames, but the RN Runtime counter on the screen also sometimes skipped a value — even though the timeline shows a separate queue execution for every value. The counter on the screen is drawn by the UI thread, after React Native has [committed and mounted](https://reactnative.dev/architecture/render-pipeline#phase-2-commit) the update. The UI thread draws only one frame per vsync. When the JS thread falls behind and then commits two updates within one frame, only the second one reaches the screen.

## UI Runtime

Unlike the RN Runtime, the UI Runtime's event loop is based entirely on the native rendering
layer. All operations scheduled with e.g. `requestAnimationFrame` or `setTimeout` will block the
native render until they finish.

With a busy JS thread, the UI Runtime still gets a `requestAnimationFrame` callback for every native
frame.

This implementation has trade-offs. Because the UI Runtime runs on the UI thread, its work might delay native rendering.

In the recording below, the UI Runtime does extra work in each frame, and the UI thread can't keep up with the vsync.
The JS thread is mostly idle, and the RN Runtime still executes its
`requestAnimationFrame` queue every vsync — but the UI can't render it in time anyway.

## UI Runtime timers

Timers like `setImmediate`, `setTimeout`, `setInterval` on the UI Runtime actually invoke
`requestAnimationFrame` under the hood. This means that, e.g., on a 60 Hz device, they run at most once
per 16 ms.

Here we call `requestAnimationFrame`, `setImmediate`, `setTimeout` and `requestAnimationFrame`
again on the UI Runtime. All four callbacks go to the same queue, so the `setImmediate` and
`setTimeout` callbacks run between the two `requestAnimationFrame` callbacks, in the next native frame.

```js
import { scheduleOnUI, setImmediate } from 'react-native-worklets';

function firstFrameCallback() {
  console.log('requestAnimationFrame 1');
}

function immediateCallback() {
  console.log('setImmediate');
}

function timeoutCallback() {
  console.log('setTimeout');
}

function secondFrameCallback() {
  console.log('requestAnimationFrame 2');
}

function scheduleCallbacks() {
  requestAnimationFrame(firstFrameCallback);
  setImmediate(immediateCallback);
  setTimeout(timeoutCallback, 0);
  requestAnimationFrame(secondFrameCallback);
}

scheduleOnUI(scheduleCallbacks);
```

## Worker Runtime

A Worker Runtime, which runs on its own dedicated thread, behaves similarly to the RN Runtime. Its
`requestAnimationFrame` queue is polyfilled with a periodic timer too.

Contrary to the RN Runtime, however, Worker Runtimes don't vsync their event loop queues by default. A `setInterval` with
a delay smaller than the vsync period might actually fire several times within a single native frame.

```js
import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

function startTimer() {
  let count = 0;
  function tick() {
    count = count + 1;
    console.log('tick:', count);
    if (count === 4) {
      clearInterval(interval);
    }
  }
  const interval = setInterval(tick, 4);
}

const worker = createWorkletRuntime();
scheduleOnRuntime(worker, startTimer);
scheduleOnUI(startTimer);
startTimer();
```

For advanced use cases, you can create a Worker Runtime
[without the default event loop](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/createWorkletRuntime#enableeventloop) and then implement it
yourself.

In the next chapter we'll learn how to synchronize data between JavaScript Runtimes using the
available event loop APIs.
