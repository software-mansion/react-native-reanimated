# scheduleOnRuntime

`scheduleOnRuntime` lets you schedule a [worklet](/docs/fundamentals/glossary#worklet) to be executed on a [Worker Runtime](/docs/fundamentals/runtimeKinds#worker-runtime).

## Reference

```javascript
import { scheduleOnRuntime, createWorkletRuntime } from 'react-native-worklets';

const workletRuntime = createWorkletRuntime({ name: 'background' });

scheduleOnRuntime(workletRuntime, (greeting: string) => {
  console.log(`${greeting} from the background Worklet Runtime`);
}, 'Hello');
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

The worklet runtime to schedule the worklet on.

### worklet

A reference to a function you want to execute on the [Worker Runtime](/docs/fundamentals/runtimeKinds#worker-runtime).

### args

Arguments to the function you want to execute on the [Worker Runtime](/docs/fundamentals/runtimeKinds#worker-runtime).

## Remarks

* The worklet is scheduled on the Worker Runtime's [Async
  Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/RunLoop/AsyncQueue.h)

## Call table

## Platform compatibility
