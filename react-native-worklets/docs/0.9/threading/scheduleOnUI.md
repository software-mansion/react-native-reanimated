# scheduleOnUI

`scheduleOnUI` lets you schedule a function to be executed on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/0.9/fundamentals/runtimeKinds#ui-runtime). The callback executes asynchronously and doesn't return a value.

## Reference

```javascript
import { scheduleOnUI } from 'react-native-worklets';

const myFunction = (): void => {
  'worklet';
  console.log('Hello from the UI Runtime!');
};

scheduleOnUI(myFunction); // Hello from the UI Runtime!
```

Type definitions

```typescript
function scheduleOnUI<Args extends unknown[], ReturnValue>(
  fun: (...args: Args) => ReturnValue,
  ...args: Args
): void;
```

### Arguments

#### fun

A reference to a function you want to schedule on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/0.9/fundamentals/runtimeKinds#ui-runtime).

#### args

Arguments to pass to the function.

## Remarks

* The callback passed as the argument is automatically [workletized](https://docs.swmansion.com/react-native-worklets/docs/0.9/fundamentals/glossary#to-workletize) and ready to be run on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/0.9/fundamentals/runtimeKinds#ui-runtime).

* On the Web, `scheduleOnUI` schedules work to run on the next animation frame using `requestAnimationFrame`.

## Call table

| Mode             | RN Runtime | UI Runtime    | Worker Runtime |
| ---------------- | ---------- | ------------- | -------------- |
| Bundle Mode      | Supported  | Supported     | Supported      |
| Legacy Eval Mode | Supported  | Not supported | Not supported  |

## Platform compatibility

| Native    | Web       |
| --------- | --------- |
| Supported | Supported |
