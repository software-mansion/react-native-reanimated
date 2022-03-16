---
id: event
title: Event handling with reanimated nodes
sidebar_label: Event handling
---

`react-native-reanimated`'s new syntax is possible to be used with `Animated.event`. Instead of providing only a mapping from event fields to animated nodes, it is allowed to write a function that takes reanimated values map as an input and return a block (or any other reanimated function) that will be then used to handle the event.

This syntax allows for providing some post-processing for the event data that does not fit well as a dependency of other nodes we connect to `Animated.View` component props. [See example](https://github.com/software-mansion/react-native-reanimated/blob/main/Example/reanimated1/PanRotateAndZoom/index.js#L25)

```js
import { event, set } from 'react-native-reanimated'

this.onGestureEvent = event([
  {
    nativeEvent: {
      translationX: x => set(this._x, x),
    },
  },
]);
```

If you'd like to use more than one event attribute in your reanimated code, this is also supported. Instead of defining event handler methods for a single attribute you can define at the level of `nativeEvent`. Here is an example that takes both translation attributes and state attribute from `PanGestureHandler` event:

```js
<PanGestureHandler
  onGestureEvent={event([
    {
      nativeEvent: ({ translationX: x, translationY: y, state }) =>
        block([
          set(this._transX, add(x, offsetX)),
          set(this._transY, add(y, offsetY)),
          cond(eq(state, State.END), [
            set(this.offsetX, add(this.offsetX, x)),
            set(this.offsetY, add(this.offsetY, y)),
          ]),
        ]),
    },
  ])}>
  <Animated.View
    style={{
      transform: [{ translateX: this._transX, translateY: this._transY }],
    }}
  />
</PanGestureHandler>
```
