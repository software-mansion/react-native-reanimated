# runOnUIAsync

`runOnUIAsync` lets you asynchronously run [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize) functions on the [UI thread](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-thread).
It returns a Promise of the worklet function's return value. The Promise is resolved asynchronously, not immediately after the callback execution.

To compare it with [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI) and [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUISync), see [Running worklet functions on the UI runtime](https://docs.swmansion.com/react-native-worklets/docs/guides/running-on-the-ui-runtime).

## Reference

```javascript
import { runOnUIAsync } from 'react-native-worklets';

// RN Runtime, JS thread

const result: Promise<number> = runOnUIAsync((): number => {
  return 1;
});

await result; // 1
```

Type definitions

```typescript
function runOnUIAsync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue>;
```

### Arguments

#### worklet

A reference to a function you want to execute on the UI thread. Arguments to your function have to be passed after the function i.e. `runOnUIAsync(setValue, 10);`.

## Remarks

* It's a common mistake to execute function inside of `runOnUIAsync` like this: ~~`runOnUIAsync(myWorklet(10))`~~. Here, the correct usage would be `runOnUIAsync(myWorklet, 10)`.

* The callback passed as the argument is automatically [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize) and ready to be run on the [UI thread](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-thread).

## Call table

## Platform compatibility
