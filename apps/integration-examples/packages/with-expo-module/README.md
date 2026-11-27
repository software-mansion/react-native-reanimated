# with-expo-module

An [Expo module](https://docs.expo.dev/modules/overview/) sends a native counter to the UI Runtime with the `Worklet` type of Expo Modules API.

```ts
import { useCounter } from 'with-expo-module/reanimated';

const count = useCounter(); // SharedValue<number>
```

## Key files

- [`src/reanimated.ts`](src/reanimated.ts): `addCounterWorkletListener` gives a worklet to native code. `useCounter` builds a shared value on it. `addCounterFrameWorkletListener` and `useCounterOnEachFrame` do the same, but native code reads the counter on each frame.
- [`ios/CounterModule.swift`](ios/CounterModule.swift) and [`android/.../CounterModule.kt`](android/src/main/java/com/example/withexpomodule/CounterModule.kt): keep the worklets and run them on each tick, or on each frame for the frame listeners.
- [`package.json`](package.json): the `./reanimated` entry point and the optional peer dependencies.

## Problems that the code prevents

- `installOnUIRuntime(getUIRuntimeHolder())` must run once before native code runs a worklet. It makes Expo Modules available on the UI Runtime.
- Native code runs the worklets on the main thread, because the UI Runtime runs there. The counter ticks on a background thread, so each tick goes to the main thread first.
- `isWorkletFunction` rejects a function without the `'worklet'` directive with a clear error.
- `OnDestroy` removes all worklets.

A real data source starts with the first listener and stops after the last. This counter runs while the module exists, to keep the example short.
