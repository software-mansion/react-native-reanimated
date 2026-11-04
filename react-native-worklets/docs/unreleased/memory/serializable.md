# Serializable

Serializable is a type of shared memory that holds an immutable value that can be serialized and deserialized across different JavaScript Runtimes. It allows passing JavaScript values between Runtimes while ensuring that the data is correctly transferred and reconstructed. The reference cannot be manipulated, as it doesn't represent any standard JavaScript object.

**You can't pass JavaScript values to other Runtimes without prior serialization.**

![Serializable](https://docs.swmansion.com/react-native-worklets/img/serializable.svg)

Serializable memory model

Type definitions

```typescript
type SerializableRef<TValue = unknown> = {
  __serializableRef: true;
  __nativeStateSerializableJSRef: TValue;
};
```

## Passing a copy

First, `createSerializable(settings)` creates an immutable serialized representation of the object in native memory and returns an opaque reference. Passing that reference to `scheduleOnUI` reconstructs the value as a JavaScript object on UI.

```js
import {
  createSerializable,
  scheduleOnRN,
  scheduleOnUI,
} from 'react-native-worklets';

(globalThis.settings = { volume: 10 });
const settingsRef = createSerializable(globalThis.settings);

function logOriginal() {
  console.log('RN original:', globalThis.settings.volume); // 10
}

function changeCopy(settings) {
  'worklet';
  (globalThis.settings = settings);
  (globalThis.settings.volume = 20);
  console.log('UI copy:', globalThis.settings.volume); // 20
  scheduleOnRN(logOriginal);
}

// The Serializable is deserialized into a JavaScript object on UI.
scheduleOnUI(changeCopy, settingsRef);
```

Watch the **Serializable (immutable)** appear in **Shared native memory** with `{ volume: 10 }`. UI receives a JavaScript copy and changes it to `{ volume: 20 }`, visible under its **Globals**. Both the Serializable and RN's original stay at `{ volume: 10 }`.

The Serializable holds an immutable representation of the value; the JavaScript object reconstructed on UI is a separate, mutable copy. Changing that copy does not update the original object or the Serializable. This example stores each object on `globalThis` to make the two copies visible; globals themselves are not shared between runtimes.

Usually, you can pass the original value directly: `scheduleOnUI(changeCopy, globalThis.settings)`. Scheduling functions automatically serialize their arguments. This example calls `createSerializable` explicitly to show the intermediate representation.

## Supported types

If you want to transfer objects with custom prototypes across Runtimes, you can use [registerCustomSerializable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/registerCustomSerializable) to define your own serialization and deserialization logic.

## Remarks

* The JavaScript value of a Serializable is a reference wrapper that only holds the C++ side in its `jsi::NativeState`.
* The prop `__nativeStateSerializableJSRef` present on the reference doesn't exist in runtime - it's only a TypeScript definition to tell you what type of value is held by the Serializable.
* Functions that aren't worklet functions are serialized as references to function instances on the respective Runtime, meaning that they can't be invoked on other runtimes, only passed around.
