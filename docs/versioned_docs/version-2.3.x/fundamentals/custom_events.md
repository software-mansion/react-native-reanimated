---
id: custom_events
title: Custom Events
sidebar_label: Custom Events
---

Apart from gestures and scroll events, Reanimated 2.x exposes a low-level API to create custom animated event handlers for custom animated components. With this API you can create handler hooks similar to the `useAnimatedGestureHandler` and `useAnimatedScrollHandler`.

## Handling events from custom animated component

Let's say that you want to animate pagination dots based on a custom component which exposes its scroll value - in this example we will use the [pager](https://github.com/callstack/react-native-pager-view) component.

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

Here, we create and animated pager with a scroll shared value, which will keep the pager's current scroll value.

Next, we create a custom handler hook to listen for native events from the pager component and process them inside a worklet.

```js
const scrollHandler = useAnimatedPagerScrollHandler({
  onPageScroll: (e) => {
    'worklet';
    scrollPosition.value = e.offset + e.position;
  },
});
```

`useAnimatedPagerScrollHandler` is our custom hook - in the _onPageScroll_ worklet we have access to the pager's current page position and offset. Combined together they give us the scroll position, which we can use to animate components or compute by how much the pager's content is offset.

To implement our custom hook we will use two low-level methods - `useHandler` and `useEvent`

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

`useHandler` is responsible for providing a context object for our handler and information whether it should be rebuilt.

`useEvent` is returning a worklet event handler, which passed to an animated component, will provide native events that can be handled on the UI thread

For a full example, checkout our Example App (look for _Custom Handler Example - Pager_)
