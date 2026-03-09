# Serializable

Serializable is a type of shared memory that holds an immutable value that can be serialized and deserialized across different JavaScript Runtimes. It allows passing JavaScript values between Runtimes while ensuring that the data is correctly transferred and reconstructed. The reference cannot be manipulated, as it doesn't represent any standard JavaScript object.

**You can't pass JavaScript values to other Runtimes without prior serialization.**

![Serializable](/img/serializable.svg)

Serializable memory model

Type definitions

```typescript
type SerializableRef<TValue = unknown> = {
  __serializableRef: true;
  __nativeStateSerializableJSRef: TValue;
};
```

## Supported types

If you want to transfer objects with custom prototypes across Runtimes, you can use [registerCustomSerializable](/docs/memory/registerCustomSerializable) to define your own serialization and deserialization logic.

## Remarks

* The JavaScript value of a Serializable is a reference wrapper that only holds the C++ side in its `jsi::NativeState`.
* The prop `__nativeStateSerializableJSRef` present on the reference doesn't exist in runtime - it's only a TypeScript definition to tell you what type of value is held by the Serializable.
* Functions that aren't worklets are serialized as references to function instances on the respective Runtime, meaning that they can't be invoked on other runtimes, only passed around.
