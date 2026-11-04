# scheduleOnRuntime

`scheduleOnRuntime` lets you schedule a [worklet function](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/concurrency-model#worklet-functions) to be executed on a [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

## Reference

```js
import { createWorkletRuntime, scheduleOnRuntime } from 'react-native-worklets';

function greet(greeting) {
  'worklet';
  console.log(`${greeting} from the background Worklet Runtime`);
}

const workletRuntime = createWorkletRuntime({ name: 'background' });
scheduleOnRuntime(workletRuntime, greet, 'Hello');
console.log('The RN Runtime continues');
```

Type definitions

```typescript
function scheduleOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;
```

## Arguments

### workletRuntime

The worklet runtime to schedule the worklet function on.

### worklet

A reference to a function you want to execute on the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

### args

Arguments to the function you want to execute on the [Worker Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds#worker-runtime).

## Remarks

* The worklet function is scheduled on the Worker Runtime's [Async
  Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/RunLoop/AsyncQueue.h)

## Call table

| Mode             | RN Runtime | UI Runtime | Worker Runtime |
| ---------------- | ---------- | ---------- | -------------- |
| Bundle Mode      | Supported  | Supported  | Supported      |
| Legacy Eval Mode | Supported  | Supported  | Supported      |

## Platform compatibility

| Native    | Web           |
| --------- | ------------- |
| Supported | Not supported |
