---
id: useEvent
title: useEvent
sidebar_label: useEvent
---

This is a low-level hook returning an event handler that will be invoked with native events, which should be used in order to create custom event handler hooks, like `useAnimatedGestureHandler` or `useAnimatedScrollHandler`.

### Arguments

#### `handler` [function]

Handler that will receive an event object with a native payload, which can be passed to the custom handler hook's worklets.

- `event` [object] - event object.
  The payload can differ depending on the type of the event.

#### `eventNames` [Array]

Array of event names that will be handled by handler.

#### `rebuilt` [boolean]

Value indicating whether the handler should be rebuilt.

### Returns

The hook returns an event handler that will be invoked when a native event is dispatched.

## Example

```js
function useAnimatedPagerScrollHandler(handlers, dependencies) {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies);

  return useEvent(
    (event) => {
      'worklet';
      const { onPageScroll } = handlers;

      if (onPageScroll && event.eventName.endsWith('onPageScroll')) {
        onPageScroll(event, context);
      }
    },
    ['onPageScroll'],
    doDependenciesDiffer,
  );
```
