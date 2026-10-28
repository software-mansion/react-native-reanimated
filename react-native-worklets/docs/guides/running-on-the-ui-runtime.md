# Running worklet functions on the UI runtime

The Worklets library provides three functions for running a [worklet function](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet) on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime) from the [RN Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#rn-runtime): [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI), [`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUIAsync) and [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUISync).
They differ in whether the worklet function runs asynchronously or synchronously, and in what they return to the caller.
Use the table below to pick the one that fits your case.

## Comparison

|  | [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI) | [`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUIAsync) | [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUISync) |
| --- | --- | --- | --- |
| **Execution** | Asynchronous | Asynchronous | Synchronous, blocks the caller until the worklet function returns |
| **Returns** | Nothing | A `Promise` that resolves with the worklet function's return value | The worklet function's return value directly |
| **Web support** | ✅ | ✅ | ❌ |
| **Use when** | You want to run a worklet function on the UI Runtime and don't need its result back | You need the worklet function's result back, but don't want to block the calling thread | You need the worklet function's result immediately, within the same synchronous flow |

The values returned by `runOnUIAsync` and `runOnUISync` have to be [serializable](https://docs.swmansion.com/react-native-worklets/docs/memory/serializable).

All three functions can be called from the [RN Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#rn-runtime), and additionally from the [UI](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime) and [Worker](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime) Runtimes when [Bundle Mode](https://docs.swmansion.com/react-native-worklets/docs/bundleMode) is enabled.
See [Call tables](https://docs.swmansion.com/react-native-worklets/docs/guides/call-tables) for the full matrix.
