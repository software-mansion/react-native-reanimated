# Memory

Copy values between runtimes or share state that more than one runtime needs to access.
Start with [Sharing memory](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/sharing-memory#choosing-between-them) to choose a memory primitive, or follow [Synchronizing data](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/synchronizing-data) for practical examples.

## Choose a memory primitive

* [`Serializable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable) — Transfer a value as an independent copy. Changes to the copy do not update the original.
* [`Synchronizable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable) — Keep shared state in native memory so multiple runtimes can read and write it.
* [`Shareable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/shareable) — Keep a value on a host runtime and access it from guest runtimes.

## Create a value

* [`createSerializable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/createSerializable) — Create an opaque reference to a serialized value. Scheduling APIs usually handle serialization for you.
* [`createSynchronizable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/createSynchronizable) — Create a shared value in native memory.
* [`createShareable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/createShareable) — Create a value hosted on a specific runtime.

## Inspect a value

* [`isSerializableRef`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/isSerializableRef) — Check whether a value is a Serializable reference.
* [`isSynchronizable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/isSynchronizable) — Check whether a value is a Synchronizable.

## Customize serialization

* [`registerCustomSerializable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/registerCustomSerializable) — Define how a custom type is transferred between runtimes.

## Deprecated APIs

These older APIs use different terminology. Follow their replacement guidance when updating existing code.

* [`makeShareable`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/makeShareable)
* [`makeShareableCloneRecursive`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/makeShareableCloneRecursive)
* [`makeShareableCloneOnUIRecursive`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/makeShareableCloneOnUIRecursive)
