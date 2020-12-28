---
id: useAnimatedGestureHandler
title: useAnimatedGestureHandler
sidebar_label: useAnimatedGestureHandler
---

This hook allows for defining worklet handlers that can serve in a process of handling gestures.

Before you can use the hook, make sure that you have `react-native-gesture-handler` [installed and configured](https://docs.swmansion.com/react-native-gesture-handler/docs/getting-started.html#installation) with your project.

### Arguments

#### `gestureHandlers` [object with worklets]

The first and only argument to this hook is an object that can carry one or more worklet handlers.
The handlers can be set under the following keys: `onStart`, `onActive`, `onEnd`, `onFail`, `onCancel`, `onFinish`.

Read more about gesture handling states in the [Gesture Handler library documentation](https://docs.swmansion.com/react-native-gesture-handler/docs/state.html).
Each of the specified handlers will be triggered depending on the current state of the attached Gesture Handler.
The handler worklet will receive the following arguments:

##### `event` [object]

Event object carrying the event payload.
The payload will be different depending on the type of the Gesture Handler to which the worklet is attached (`PanGestureHandler`, `RotationGestureHandler`, etc.).
Please check the documentation section on the [selected handler type](https://docs.swmansion.com/react-native-gesture-handler/docs/getting-started.html) to learn about the event structure.

##### `context` [object]

A plain JS object that can be used to store some state.
This object will persist in between events and across worklet handlers for all the selected states and you can read and write any data to it.

### Returns

The hook returns a handler object that can be attached to one of the gesture handler components provided by the `react-native-gesture-handler` library.
The handler should be passed under `onGestureEvent` parameter regardless of what gesture states we are interested in processing.

## Example

In the below example we use [`PanGestureHandler`](https://docs.swmansion.com/react-native-gesture-handler/docs/handler-pan.html) to register for pan gesture events performed on the rendered View.
We attach three handler worklets that are going to be triggered when the gesture starts, when it is active and the user is panning, and when the gesture is over.
We create a shared value `x` that will correspond to the x-translation of the box.
In `onStart` handler worklet we use `context` to save the current value of `x` and therefore remember the place at which the gesture started.
When the user is panning, in `onActive` handler we update the translation by taking the starting point remembered in `context` object and adding the translation that is coming from the gesture.
Finally, in `onEnd` handler we initiate an animation that'd make the box return to the initial point.

Thanks to the `context` object, where we remember the initial position, the interaction can be made interruptible.
That is, we can continue the gesture from the place where we pick up the box, regardless of whether it is in the middle of animating back to the initial point.

```js
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

function App() {
  const x = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: _ => {
      x.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}
```
