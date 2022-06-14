---
id: custom_events
title: Custom Events
sidebar_label: Custom Events
---

Apart from gestures and scroll events, Reanimated 2.x exposes low-level API to create custom animated event handlers for custom animated components. With this API you can create handler hooks similar to `useAnimatedGestureHandler` and `useAnimatedScrollHandler`.

## Handling events from custom animated component

Let's say that you want to animate pagination dots based on custom component which exposes its scroll value - for that example we will use [pager](https://github.com/callstack/react-native-pager-view) component.

```js
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const PagerExample = () => {
  const scrollPosition = useSharedValue(0);
  return (
    <AnimatedPagerView initialPage={0} onPageScroll={scrollHandler}>
      <View collapsable={false}>
        <Text>{`Page ${1}`}</Text>
      </View>
      <View collapsable={false}>
        <Text>{`Page ${2}`}</Text>
      </View>
    </AnimatedPagerView>
  );
};
```

Here, we create animated pager with a scroll shared value, which will keep current pager's scroll value.

Next, we create custom handler hook to listen for native events from pager component and process them inside worklets.

```js
const scrollHandler = useAnimatedPagerScrollHandler({
  onPageScroll: (e) => {
    'worklet';
    scrollPosition.value = e.offset + e.position;
  },
});
```

`useAnimatedPagerScrollHandler` is our custom hook - in _onPageScroll_ worklet we have access to current pager's page position and offset, combined together, give us scroll position, which we can use to animate components or compute by how much density points pager content is offset.

To implement custom hook we will use two low-level methods - `useHandler` and `useEvent`

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
    doDependenciesDiffer
  );
}
```

`useHandler` is responsible for providing context object for our handler, and an information whether it should be rebuilt.

`useEvent` is returning worklet event handler, which passed to animated component, will provide native events that can be handled on UI thread

For full example, checkout Example App (look for Custom Handler Example - Pager)
