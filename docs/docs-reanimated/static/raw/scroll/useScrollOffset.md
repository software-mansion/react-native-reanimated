# useScrollOffset

`useScrollOffset` lets you to create animations based on the offset of a scrollable component (e.g. `ScrollView`, `FlatList`, `FlashList`).
The hook automatically detects if the scrollable is horizontal or vertical.

## Reference

```tsx
import { useScrollOffset } from 'react-native-reanimated';

function App() {
  const animatedRef = useAnimatedRef<ScrollView>();
  // highlight-next-line
  const scrollOffset = useScrollOffset(animatedRef);
  return <ScrollView ref={animatedRef}>{/* ... */}</ScrollView>;
}
```

Type definitions

```typescript
function useScrollOffset<C extends ScrollableComponent>(
  animatedRef: AnimatedRef<C> | null,
  providedOffset?: SharedValue<number>
): SharedValue<number>;

type ScrollableComponent = Component<
  Pick<
    ScrollViewProps,
    | 'onScroll'
    | 'onScrollBeginDrag'
    | 'onScrollEndDrag'
    | 'onMomentumScrollBegin'
    | 'onMomentumScrollEnd'
  >
> &
  Pick<ScrollView, 'getScrollableNode'>;
```

### Arguments

#### `animatedRef`

An [animated ref](/docs/core/useAnimatedRef#returns) connected to the scrollable component you'd want to scroll on. The animated ref has to be passed either to an \[Animated component]\(/docs/fundamentals/
glossary#animated-component) or a React Native built-in component.

#### `providedOffset`&#x20;

An optional shared value to be updated with the scroll offset. If not provided a new shared value, created internally, will be updated and returned.

### Returns

`useScrollOffset` returns a [shared value](/docs/fundamentals/glossary#shared-value) which holds the current offset of the scrollable component.

## Example

## Remarks

* The `animatedRef` argument can be changed at will and the hook will correctly return values based on the scrollable component it is connected to, for example:

  `useScrollOffset(someState ? someScrollRefA : someScrollRefB)`

## Platform compatibility
