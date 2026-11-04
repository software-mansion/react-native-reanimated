# Call tables

Call tables are quick references that show **where a given scheduling function can be called from**, depending on whether [Bundle Mode](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode) is enabled or not.

### Why does Bundle Mode matter?

In [Legacy Eval Mode](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode#legacy-eval-mode), Worklet Runtimes only have a subset of functionalities of the RN Runtime, due to limitations of serialization of worklet functions. With Bundle Mode enabled, every runtime has access to the full JavaScript bundle, so most threading APIs become available on all runtimes.

### How to read a call table

Take [scheduleOnUI](https://docs.swmansion.com/react-native-worklets/docs/unreleased/threading/scheduleOnUI) as an example:

| Mode             | RN Runtime | UI Runtime    | Worker Runtime |
| ---------------- | ---------- | ------------- | -------------- |
| Bundle Mode      | Supported  | Supported     | Supported      |
| Legacy Eval Mode | Supported  | Not supported | Not supported  |

A green check mark in the table means that the function can be called from that runtime, while a red cross means that calling the function from that runtime will throw an error. So in this case, `scheduleOnUI` can be called from any runtime when Bundle Mode is on, but only from the RN Runtime when Bundle Mode is off:

The following example runs the same code in both modes: the RN Runtime schedules a worker, and that worker tries to schedule a function on the UI Runtime.

Legacy Eval Mode

The worker starts, but its call to `scheduleOnUI` throws. The UI function never runs.

```js
import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

function showResult() {
  'worklet';
  console.log('UI received the result');
}

function sendResult() {
  'worklet';
  console.log('Worker is running');
  // Calling scheduleOnUI from a Worklet Runtime requires Bundle Mode.
  scheduleOnUI(showResult);
}

const worker = createWorkletRuntime({ name: 'background' });
scheduleOnRuntime(worker, sendResult);
```

Bundle Mode

The worker can call `scheduleOnUI`, so the UI Runtime receives the task and logs the result.

```js
import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

function showResult() {
  'worklet';
  console.log('UI received the result');
}

function sendResult() {
  'worklet';
  console.log('Worker is running');
  // Calling scheduleOnUI from a Worklet Runtime requires Bundle Mode.
  scheduleOnUI(showResult);
}

const worker = createWorkletRuntime({ name: 'background' });
scheduleOnRuntime(worker, sendResult);
```
