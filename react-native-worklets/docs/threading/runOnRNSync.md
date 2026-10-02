# runOnRNSync

`runOnRNSync` lets you run a function synchronously on the [RN Runtime](/docs/fundamentals/runtimeKinds#rn-runtime) from any runtime and get its return value. The calling thread waits until the JavaScript thread finishes running the function.

## Reference

```javascript
import { runOnRNSync, scheduleOnUI } from 'react-native-worklets';

const getUserName = (): string => store.user.name;

scheduleOnUI(() => {
  'worklet';
  const name = runOnRNSync(getUserName);
  console.log(name);
});
```

Type definitions

```typescript
function runOnRNSync<Args extends unknown[], ReturnValue>(
  fun: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;
```

### Arguments

#### fun

A function you want to execute on the [RN Runtime](/docs/fundamentals/runtimeKinds#rn-runtime). It can be a function defined on the RN Runtime, a [worklet](/docs/fundamentals/glossary#worklet) or a host function. The same functions as in [`scheduleOnRN`](/docs/threading/scheduleOnRN#what-functions-can-be-passed-to-scheduleonrn) are accepted.

#### args

Arguments to pass to the function. They must be convertible to a [Serializable](/docs/memory/serializable).

### Returns

`runOnRNSync` returns the return value of the function passed as the first argument. It can only return values that can be converted to a [Serializable](/docs/memory/serializable).

## Remarks

* When called on the RN Runtime, `runOnRNSync` calls the function directly.
* On the UI Runtime and Worker Runtimes, `runOnRNSync` works only with the [Bundle Mode](/docs/bundleMode/).
* An error thrown by the function is rethrown on the calling runtime with the same message. In development builds its stack holds the RN Runtime frames, labeled `[RN]`, followed by the stack of the `runOnRNSync` call.
* The calling thread is blocked while the JavaScript thread runs the function. Don't call `runOnRNSync` in code that runs every frame.
* `runOnRNSync` deadlocks if the JavaScript thread is waiting for the calling runtime at the same time. For example, a worklet on the UI Runtime must not call `runOnRNSync` while the RN Runtime waits in [`runOnUISync`](/docs/threading/runOnUISync) for the UI Runtime. Calling `runOnRNSync` from inside `runOnUISync` is safe, because that worklet already runs on the JavaScript thread.

## Call table

## Platform compatibility
