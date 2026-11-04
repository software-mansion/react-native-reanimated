# Threading

Run work on another runtime, return a result, or create a worker for background calculations.
Start with [Running worklets on the UI runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/guides/running-on-the-ui-runtime) to compare asynchronous and synchronous calls. See [Call tables](https://docs.swmansion.com/react-native-worklets/docs/unreleased/guides/call-tables) for which runtimes can call each API.

## Run on the UI Runtime

* [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnUI) — Schedule work without waiting for a result.
* [`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUIAsync) — Run work asynchronously and await its result.
* [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUISync) — Run work synchronously on the calling thread, blocking until the result is ready.
* [`UIRuntimeId`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/uiRuntimeId) — Identify the UI Runtime when an API takes a runtime ID.

## Run on a Worker Runtime

* [`createWorkletRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/createWorkletRuntime) — Create and configure a worker runtime.
* [`scheduleOnRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnRuntime) — Schedule work on a worker without waiting for a result.
* [`runOnRuntimeAsync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeAsync) — Run work on a worker and await its result.
* [`runOnRuntimeSync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeSync) — Access a worker runtime synchronously from the calling thread.

## Return to the RN Runtime

* [`scheduleOnRN`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnRN) — Schedule a function on the React Native runtime, for example to update React state.

## Address a runtime by ID

Use these variants when you have a runtime ID instead of a `WorkletRuntime` object.

* [`scheduleOnRuntimeWithId`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnRuntimeWithId) — Schedule work without waiting for a result.
* [`runOnRuntimeAsyncWithId`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeAsyncWithId) — Run work asynchronously and await its result.
* [`runOnRuntimeSyncWithId`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntimeSyncWithId) — Run work synchronously and return its result.

## Deprecated APIs

For new code, use the replacements linked from these reference pages.

* [`runOnUI`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnUI) — Use `scheduleOnUI`.
* [`runOnJS`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnJS) — Use `scheduleOnRN`.
* [`runOnRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/runOnRuntime) — Use `scheduleOnRuntime`.
* [`executeOnUIRuntimeSync`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/executeOnUIRuntimeSync) — Use `runOnUISync`.
* [`callMicrotasks`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/callMicrotasks) — Legacy helper for manually flushing UI microtasks.
