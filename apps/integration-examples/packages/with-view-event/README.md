# with-view-event

A native view sends a counter as a Fabric event. A Reanimated event handler runs a worklet for each event on the UI Runtime.

```tsx
import { useSharedValue } from 'react-native-reanimated';
import { AnimatedCounterView, useCountHandler } from 'with-view-event/reanimated';

const count = useSharedValue(0);
const onCount = useCountHandler({
  onCount: (event) => {
    'worklet';
    count.set(event.count);
  },
});

<AnimatedCounterView onCount={onCount} />;
```

## Key files

- [`src/CounterViewNativeComponent.ts`](src/CounterViewNativeComponent.ts): the codegen spec of the view and its `onCount` event.
- [`src/reanimated.ts`](src/reanimated.ts): `useCountHandler`, built on `useEvent` and `useHandler`, and `AnimatedCounterView`.
- [`ios/CounterComponentView.mm`](ios/CounterComponentView.mm) and [`android/.../CounterView.kt`](android/src/main/java/com/example/counterview/CounterView.kt): count while the view is in a window and send `onCount`.

## Problems that the code prevents

- On iOS, the view sends the event on the main thread. Reanimated ignores Fabric events from other threads ([`ReanimatedModule.mm`](https://github.com/software-mansion/react-native-reanimated/blob/4.8.0/packages/react-native-reanimated/apple/reanimated/apple/ReanimatedModule.mm#L67)). On Android, Reanimated moves the event to the UI thread, so the view sends it from the counter thread.
- The data comes only while the view is mounted. The app renders a view with no size for it.
- The view must be an animated component (`Animated.createAnimatedComponent`). Otherwise the handler is not registered.
