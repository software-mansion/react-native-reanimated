# with-nitro

A [Nitro](https://nitro.margelo.com) HybridObject sends a native counter to a callback. The callback is a worklet that runs on the UI Runtime.

```ts
import { useCounter } from 'with-nitro/reanimated';

const count = useCounter(); // SharedValue<number>
```

## Key files

- [`src/specs/Counter.nitro.ts`](src/specs/Counter.nitro.ts): the HybridObject. `addListener` takes an ordinary callback.
- [`src/reanimated.ts`](src/reanimated.ts): installs a `Dispatcher` on the UI Runtime, then calls `addListener` from a worklet on the UI Runtime.
- [`cpp/WorkletsUIDispatcher.hpp`](cpp/WorkletsUIDispatcher.hpp): a Nitro `Dispatcher` for the UI Runtime, made only from the Worklets stable API.
- [`cpp/HybridCounter.cpp`](cpp/HybridCounter.cpp): the HybridObject and the counter thread.
- `nitrogen/generated`: code that `yarn nitrogen` generates from the spec.

## Problems that the code prevents

- Nitro calls a callback through the `Dispatcher` of the runtime that created the callback. Worklets and Reanimated do not install a `Dispatcher` on the UI Runtime, so this package installs one. This is a workaround until Nitro or Worklets gives one. A UI Runtime has one `Dispatcher`. If another library installed one before, the install throws in a debug build of Nitro, and replaces the first one in a release build. Without this install, `addListener` from `runOnUISync` throws an error. From `scheduleOnUI`, Nitro installs its main-thread `Dispatcher`, and the app crashes after a JavaScript reload on iOS and when a C++ thread calls the callback on Android.
- The `Dispatcher` runs a job only while the UI Runtime exists. Jobs that wait in the queue during a JavaScript reload do nothing.
- The `Dispatcher` must exist before the first `addListener` call on the UI Runtime. The install and the `addListener` call both go through `scheduleOnUI`, which runs jobs in order.
- `installUIRuntimeDispatcher` gets the UI Runtime holders. The example uses a raw JSI method for it.
- On Android, `scheduleOnUI` calls Java. The counter thread attaches to the Java VM with `facebook::jni::ThreadScope`.
- A HybridObject works inside a worklet, because Nitro registers it as a custom serializable of Worklets.
