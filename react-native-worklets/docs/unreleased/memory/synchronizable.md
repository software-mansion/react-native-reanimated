# Synchronizable

Synchronizable is a type of shared memory not tied to any JavaScript Runtime. It can be accessed from any JavaScript Runtime and C++. The value held by Synchronizable behaves like a standard JavaScript value.

You can use Synchronizable on multiple Runtimes to poll some shared state information without expensive synchronous messaging between Runtimes.

Synchronizable can be accessed both non-exclusively or exclusively - meaning that a thread (Runtime) could obtain it and all other threads (Runtimes) trying to access it will have to wait until it's released.

![Synchronizable](https://docs.swmansion.com/react-native-worklets/img/synchronizable.svg)

Synchronizable memory model

## Synchronizable subtypes

Currently there are two subtypes of Synchronizable, which behave slightly different and can store different kind of data.

### Synchronizable Dynamic

General subtype of Synchronizable. It can hold any JavaScript type that is convertible to a [Serializable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable) and you can change that type at your discretion, i.e. hold an instance of Set at one point in time, then a String in the other.

This comes with a drawback, that every read and write has to pass serialization-deserialization layer when crossing the C++ - JavaScript boundary.

### Synchronizable Fixed

Special subtype of Synchronizable that can only hold a fixed type, and only one of the two - either a JavaScript `number` or `boolean`, which are fixed size primitives. The type stored cannot be changed at runtime.

Primitive JavaScript values are trivially serialized and deserialized, therefore **Synchronizable Fixed comes with no overhead, compared to the Dynamic**. For storing boolean flags or simple number state, we highly recommend [using the Fixed type](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/createSynchronizable#config).

Type definitions

```typescript
type Synchronizable<TValue = unknown> = {
  getDirty(): TValue;
  getBlocking(): TValue;
  setBlocking(value: TValue | ((prev: TValue) => TValue)): void;
  lock(): void;
  unlock(): void;
};

type FixedSynchronizable<TValue extends number | boolean = number | boolean> =
  Synchronizable<TValue> & {
    setDirty(value: TValue): void;
  };
```

## Reference

```js
import { createSynchronizable, scheduleOnUI } from 'react-native-worklets';

const synchronizable = createSynchronizable({ a: 42 });

function readOnUI() {
  'worklet';
  const value = synchronizable.getBlocking();
  console.log(value); // { a: 24 }
}

synchronizable.setBlocking({ a: 24 });
scheduleOnUI(readOnUI);
```

The RN Runtime updates the value before scheduling the UI read, so UI reads `{ a: 24 }`. Watch the value change in **Shared native memory**: both runtimes access the same Synchronizable.

When reads and writes compete on different threads, the value read depends on which thread acquires the Synchronizable first. The diagram below illustrates a read that happens before a competing write.

![Synchronizable flow](https://docs.swmansion.com/react-native-worklets/img/synchronizable-flow.svg)

Competing operations with `getBlocking` executing first. Time axis is not to
scale.

## Methods

Synchronizable has the following methods to access and modify its value:

### getBlocking

Exclusively obtains the Synchronizable and returns its value, potentially blocking if `getBlocking` or `setBlocking` are being executed on another thread or if the Synchronizable is explicitly locked by another thread.

### getDirty

Non-exclusively obtains the Synchronizable and returns its value. It never blocks, even if the Synchronizable is explicitly locked, therefore could result in a [dirty read](https://en.wikipedia.org/wiki/Write%E2%80%93read_conflict). Useful for scenarios where eventual consistency is acceptable.

### setBlocking

Exclusively obtains the Synchronizable and sets it to the provided value, potentially blocking if `getBlocking`, `setBlocking` or `setDirty` are being executed on another thread or if the Synchronizable is explicitly locked by another thread. You can also pass a setter function that receives the previous value and returns the new value. Synchronizable is **locked for the duration of the setter function execution**.

```js
import {
  createSynchronizable,
  scheduleOnRN,
  scheduleOnUI,
} from 'react-native-worklets';

const counter = createSynchronizable(0, { fixedType: true });

function report() {
  const value = counter.getBlocking();
  console.log(value); // 2: both increments have finished.
}

function increment() {
  'worklet';
  counter.setBlocking((previous) => previous + 1);
  scheduleOnRN(report);
}

counter.setBlocking((previous) => previous + 1);
scheduleOnUI(increment);
```

For non-fixed-type Synchronizables, the value provided to `setBlocking` is serialized automatically. Fixed-type Synchronizables take the plain value without serialization.

### setDirty

Available only on [Synchronizable Fixed](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable#synchronizable-fixed). Non-exclusively obtains the Synchronizable and sets it to the provided value, potentially blocking if `getBlocking` or `setBlocking` are being executed on another thread or if the Synchronizable is explicitly locked by another thread. It doesn't block when `setDirty` is being executed on another thread, therefore could result in a [lost update](https://en.wikipedia.org/wiki/Write%E2%80%93write_conflict). Accepts a plain value only, not a setter function.

### lock

Exclusively locks the Synchronizable - other threads are blocked when calling `getBlocking`, `setBlocking`, `setDirty` or `lock` until the Synchronizable is unlocked. Multiple calls on the same thread do nothing.

### unlock

Unlocks the Synchronizable. Does nothing on already unlocked Synchronizable. Works only when called from the same thread which locked the Synchronizable. Forgetting to unlock a Synchronizable could lead to deadlocks.

## C++ integration

Synchronizable can be created and accessed from C++ code. The C++ API doesn't support setter functions.

## Remarks

* Synchronizable is not reactive, meaning that there are no built-in mechanisms to notify Runtimes when its value changes. Runtimes need to poll the value to detect changes.
* Synchronizable on a JavaScript Runtime is a wrapper to a reference to the actual Synchronizable living in C++. The value held by Synchronizable is copied to/from C++ on each access.
