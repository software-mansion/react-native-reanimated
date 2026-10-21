# scheduleOnUI

`scheduleOnUI` lets you schedule a function to be executed on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime). The callback executes asynchronously and doesn't return a value.

To compare it with [`runOnUIAsync`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUIAsync) and [`runOnUISync`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUISync), see [Running worklets on the UI runtime](https://docs.swmansion.com/react-native-worklets/docs/guides/running-on-the-ui-runtime).

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

A reference to a function you want to schedule on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).

#### args

Arguments to pass to the function.

## Remarks

* The callback passed as the argument is automatically [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize) and ready to be run on the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).

* On the Web, `scheduleOnUI` schedules work to run on the next animation frame using `requestAnimationFrame`.

## Call table

## Platform compatibility
