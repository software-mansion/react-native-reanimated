# ui-to-native

A worklet on the UI Runtime calls a method of a TurboModule directly, once per frame. Native code does not send anything: the worklet reads the value when it needs it.

```ts
import { useCounter } from 'ui-to-native/reanimated';

const count = useCounter(); // SharedValue<number>
```

## Key files

- [`src/index.ts`](src/index.ts): `getCount` works on the RN Runtime and in a worklet.
- [`src/reanimated.ts`](src/reanimated.ts): `useCounter` calls `getCount` from `useFrameCallback`.
- [`ios/PolledCounter.mm`](ios/PolledCounter.mm) and [`android/.../PolledCounterModule.kt`](android/src/main/java/com/example/polledcounter/PolledCounterModule.kt): an ordinary TurboModule with a synchronous method.

## Problems that the code prevents

- A worklet that reads a method from a TurboModule object crashes the app, unless the RN Runtime read that method first. As a workaround, `src/index.ts` reads the method on the RN Runtime and gives only the function to the worklet. Each library that calls a TurboModule from a worklet must do the same.
- The method runs on the UI thread, at the same time as the counter thread. The counter is atomic.
