# Utility

Inspect where your code is running and which Worklets features are available.
See [Runtime kinds](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds) for the difference between the RN, UI, and Worker Runtimes.

## Identify the runtime and thread

* [`getRuntimeKind`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/getRuntimeKind) — Get the kind of runtime executing the current code.
* [`getCurrentThreadId`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/getCurrentThreadId) — Get the platform-specific ID of the executing thread. A runtime and a thread are different things.

## Check the runtime kind

* [`isRNRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/isRNRuntime) — Check whether code is running on the React Native runtime.
* [`isUIRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/isUIRuntime) — Check whether code is running on the UI Runtime.
* [`isWorkerRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/isWorkerRuntime) — Check whether code is running on a Worker Runtime.
* [`isWorkletRuntime`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/isWorkletRuntime) — Check whether code is running on either a UI or Worker Runtime.

## Check functions and configuration

* [`isWorkletFunction`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/isWorkletFunction) — Check whether a function has been workletized.
* [`isBundleModeEnabled`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/utility/isBundleModeEnabled) — Check whether Bundle Mode is enabled.
