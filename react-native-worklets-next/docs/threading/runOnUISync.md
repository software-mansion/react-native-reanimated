# runOnUISync

`runOnUISync` lets you run a [workletized](https://docs.swmansion.com/react-native-worklets-next/docs/fundamentals/glossary#to-workletize) function synchronously on the [UI Runtime](https://docs.swmansion.com/react-native-worklets-next/docs/fundamentals/runtimeKinds#ui-runtime).

To compare it with [`scheduleOnUI`](https://docs.swmansion.com/react-native-worklets-next/docs/threading/scheduleOnUI) and [`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets-next/docs/threading/runOnUIAsync), see [Running worklets on the UI runtime](https://docs.swmansion.com/react-native-worklets-next/docs/guides/running-on-the-ui-runtime).

## Reference

```javascript
import { runOnUISync } from 'react-native-worklets';

const myFunction = (num: number): number => {
  'worklet';
  return num + 1;
};

const result: number = runOnUISync(myFunction, 0);

console.log(result); // 1
```

Type definitions

```typescript
function runOnUISync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;
```

### Arguments

#### worklet

A function you want to execute on the [UI Runtime](https://docs.swmansion.com/react-native-worklets-next/docs/fundamentals/runtimeKinds#ui-runtime).

#### args

Arguments to pass to the function.

### Returns

`runOnUISync` returns the return value of the function passed as the first argument. It can only return values that can be converted to a [Serializable](https://docs.swmansion.com/react-native-worklets-next/docs/memory/serializable).

## Remarks

* The callback passed as the argument is automatically [workletized](https://docs.swmansion.com/react-native-worklets-next/docs/fundamentals/glossary#to-workletize) and ready to be run on the [UI Runtime](https://docs.swmansion.com/react-native-worklets-next/docs/fundamentals/runtimeKinds#ui-runtime).

## Call table

## Platform compatibility
