# Using the event loop

In the [previous chapter](/docs/tutorials/returning-results) we learned how to return results from
dispatched worklet functions.

In this chapter we'll learn some theory about event loops, which you can use for more robust
applications of worklet functions.

## Event loops in React Native

The event loops available in React Native are similar to the ones
[in the browser](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model).
All
functions to use the event loop, like `setTimeout` or `requestAnimationFrame` are available on the
[RN Runtime](/docs/concepts/runtimeKinds#rn-runtime) and
[Worklet Runtimes](/docs/concepts/runtimeKinds#worklet-runtime), but they might behave slightly
different
based on the context.

## RN Runtime

The RN Runtime's event loop is handled solely by the
[RN JS thread](https://reactnative.dev/architecture/threading-model). This means, unlike in the
browser,
this Runtime's event loop *is not tied to the native rendering layer* and
[`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
is polyfilled with a periodic timer.

The application UI will not wait for the current iteration of the `requestAnimationFrame` queue
execution to finish when rendering a frame.

figure showing how the RN Runtime raf queue is disjointed from the native rendering layer

## UI Runtime

Conversely to the RN Runtime, the UI Runtime's event loop is based entirely on the native rendering
layer. All operations scheduled with i.e. `requestAnimationFrame` or `setTimeout` will block the
native render until they finish.

figure showing how the UI Runtime raf queue it coupled with the native rendering layer

Timers like `setImmediate`, `setTimeout`, `setInterval` on the UI Runtime actually invoke
`requestAnimationFrame` under the hood. This means that i.e. for 60Hz devices, will be executed only
once per 16ms, assuming no frame drops.

## Worker Runtime

For a Worker Runtime that runs on its dedicated thread, it's very similar to the RN Runtime. It's
`requestAnimationFrame` queue is polyfilled with a periodic timer.

For advanced use cases, you can create a Worker Runtime
[without an event loop](/docs/threading/createWorkletRuntime#enableeventloop) and then implement it
yourself.

In the next chapter we'll learn how to synchronize with data between JavaScript Runtimes. using the
available event loop APIs.
