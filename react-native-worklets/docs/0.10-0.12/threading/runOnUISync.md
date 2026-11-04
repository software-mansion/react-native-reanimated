# runOnUISync

`runOnUISync` lets you run a [workletized](https://docs.swmansion.com/react-native-worklets/docs/0.10-0.12/fundamentals/glossary#to-workletize) function synchronously on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/0.10-0.12/fundamentals/runtimeKinds#ui-runtime).

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

A function you want to execute on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/0.10-0.12/fundamentals/runtimeKinds#ui-runtime).

#### args

Arguments to pass to the function.

### Returns

`runOnUISync` returns the return value of the function passed as the first argument. It can only return values that can be converted to a [Serializable](https://docs.swmansion.com/react-native-worklets/docs/0.10-0.12/memory/serializable).

## Remarks

* The callback passed as the argument is automatically [workletized](https://docs.swmansion.com/react-native-worklets/docs/0.10-0.12/fundamentals/glossary#to-workletize) and ready to be run on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/0.10-0.12/fundamentals/runtimeKinds#ui-runtime).

## Call table

| Mode             | RN Runtime | UI Runtime    | Worker Runtime |
| ---------------- | ---------- | ------------- | -------------- |
| Bundle Mode      | Supported  | Supported     | Supported      |
| Legacy Eval Mode | Supported  | Not supported | Not supported  |

## Platform compatibility

| Native    | Web           |
| --------- | ------------- |
| Supported | Not supported |
