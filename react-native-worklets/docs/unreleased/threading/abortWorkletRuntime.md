# abortWorkletRuntime

`abortWorkletRuntime` stops a [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime) that was created with `abortable: true`.

* Currently running task (i.e. a worklet function scheduled with `scheduleOnRuntime`) finishes before the runtime stops.
* Work that's still waiting in the runtime's queue is dropped, and the promises of dropped [runOnRuntimeAsync](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnRuntimeAsync) jobs are rejected. The runtime's timers and in-flight network requests are cancelled.
* Work scheduled on the runtime after the abort, for example with [scheduleOnRuntime](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRuntime), is dropped. In development builds, Worklets logs a warning. Running work on it synchronously, for example with [runOnRuntimeSync](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnRuntimeSync), throws.

## Reference

```javascript
import { abortWorkletRuntime, createWorkletRuntime, scheduleOnRuntime } from 'react-native-worklets';

const workletRuntime = createWorkletRuntime({ name: 'background', abortable: true });

for (const chunk of chunks) {
  scheduleOnRuntime(workletRuntime, () => {
    'worklet';
    processChunk(chunk);
  });
}

// The chunk that's being processed finishes. The remaining chunks are dropped.
abortWorkletRuntime(workletRuntime.runtimeId);
```

Type definitions

```typescript
function abortWorkletRuntime(runtimeId: number): boolean;
```

## Arguments

### runtimeId

The id of the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime) to abort. You can get the id from the runtime object by accessing its `runtimeId` property.

## Returns

`true` if the runtime exists and is now aborted, also when it was already aborted before. `false` if no runtime has this id, for example because the runtime was already destroyed.

## Remarks

* Passing the id of the UI Runtime or of a runtime that isn't abortable throws.

## Call table

| Mode             | RN Runtime | UI Runtime | Worker Runtime |
| ---------------- | ---------- | ---------- | -------------- |
| Bundle Mode      | Supported  | Supported  | Supported      |
| Legacy Eval Mode | Supported  | Supported  | Supported      |

## Platform compatibility

| Native    | Web           |
| --------- | ------------- |
| Supported | Not supported |
