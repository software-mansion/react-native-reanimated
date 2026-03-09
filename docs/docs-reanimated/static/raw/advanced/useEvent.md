# useEvent

`useEvent` is a low-level hook. It returns an event handler that will be called when a native event occurs. You can use it to create custom event handler hooks, like [`useScrollOffset`](/docs/scroll/useScrollOffset/) or [`useAnimatedScrollHandler`](/docs/scroll/useAnimatedScrollHandler/).

## Reference

```js
import { useEvent } from 'react-native-reanimated';

function useAnimatedPagerScrollHandler(handlers, dependencies) {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies);

  // highlight-start
  return useEvent(
    (event) => {
      'worklet';
      const { onPageScroll } = handlers;

      if (onPageScroll && event.eventName.endsWith('onPageScroll')) {
        onPageScroll(event, context);
      }
    },
    ['onPageScroll'],
    doDependenciesDiffer
  );
}
// highlight-end

return <Animated.View onScroll={useAnimatedPagerScrollHandler} />;
```

Type definitions

```typescript
function useEvent<
  Event extends object,
  Context extends Record<string, unknown> = never,
>(
  handler: EventHandler<Event, Context>,
  eventNames?: string[],
  rebuild?: boolean
): EventHandlerProcessed<Event, Context>;

type EventHandler<
  Event extends object,
  Context extends Record<string, unknown> = never,
> = (event: ReanimatedEvent<Event>, context?: Context) => void;

type EventHandlerProcessed<
  Event extends object,
  Context extends Record<string, unknown> = never,
> = (event: Event, context?: Context) => void;
```

### Arguments

#### `handler`

Function that receives an event object with a native payload, which can be passed to the custom handler hook's worklets.

* `event` - event object.
  The payload can differ depending on the type of the event.

#### `eventNames`&#x20;

Array of event names that will be handled by the handler.

#### `rebuild`&#x20;

Value indicating whether the handler should be rebuilt.

### Returns

The hook returns an event handler that will be invoked when a native event is dispatched. That handler may be connected to multiple components and will be invoked for each one's specific events.

## Example

This example can be more easily implemented using [`useScrollOffset`](/docs/scroll/useScrollOffset/).

## Remarks

* Keep in mind that not all scroll events are supported on the web, only `onScroll` is available across browsers.

## Platform compatibility
