---
sidebar_position: 6
---

# Handling gestures

In this section, we'll learn how to handle gestures with Reanimated. To achieve this, Reanimated integrates tightly with [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/docs/), another library created by Software Mansion.

Gesture Handler comes with plentiful gestures like [`Pinch`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/pinch-gesture) or [`Fling`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/fling-gesture). Right now we'll start simple and get to know [`Tap`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/tap-gesture) and [`Pan`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/pan-gesture) gestures as well as how to use [`withDecay`](/docs/animations/withDecay) animation function.

Just make sure to go through the Gesture Handler [installation steps](https://docs.swmansion.com/react-native-gesture-handler/docs/installation) first and come back here to learn how to use it with Reanimated.

## Handling tap gestures

Let's start with the simplest gesture - tapping. Tap gesture detects fingers touching the screen for a short period of time. You can use them to implement custom buttons or pressable elements from scratch.

In this example, we'll create a circle which will grow and change color on touch.

First, let's wrap our app with [`GestureHandlerRootView`](https://docs.swmansion.com/react-native-gesture-handler/docs/installation/#js). Make sure to keep the `GestureHandlerRootView` as close to the actual root view as possible. That'll ensure that our gestures will work as expected with each other.

```jsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* rest of the app */}
    </GestureHandlerRootView>
  );
}
```

New tap gestures are defined with `Gesture.Tap()` in your component's body. You can define the behavior of the gesture by chaining methods like [`onBegin`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/tap-gesture/#onbegincallback), [`onStart`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/tap-gesture/#onstartcallback), [`onEnd`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/tap-gesture/#onendcallback), or [`onFinalize`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/tap-gesture/#onfinalizecallback) on the gesture. We'll use them to update a shared value just after the gesture begins and return to the initial value when the gesture finishes.

import TapGesture from '@site/src/examples/HandlingGestures/TapGesture';
import TapGestureSrc from '!!raw-loader!@site/src/examples/HandlingGestures/TapGesture';

<CollapsibleCode showLines={[16, 25]} src={TapGestureSrc} />

You can safely access the shared values because callbacks passed to gestures are automatically [workletized](/docs/fundamentals/glossary#to-workletize) for you.

We'd like our circle to change color from violet to yellow and smoothly scale by 20% on tap. Let's define that animation logic using `withTiming` in the `useAnimatedStyle`:

<CollapsibleCode showLines={[27, 30]} src={TapGestureSrc} />

You need to pass your defined gesture to the `gesture` prop of the [`GestureDetector`](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/gesture-detector) component. That component should wrap the view you'd like to handle gestures on. Also, remember to pass the defined `animatedStyles` to the view you want to animate like so:

<CollapsibleCode showLines={[32, 43]} src={TapGestureSrc} />

And that's it! Pretty straightforward, isn't it? Let's see it in the full glory in an interactive example:

<InteractiveExample
  src={TapGestureSrc}
  component={<TapGesture />}
  label="Tap the circle"
/>

You can make the use of [composing gestures](https://docs.swmansion.com/react-native-gesture-handler/docs/gesture-composition/) to more complex behaviors. But what if we'd like to create something a bit more interesting?

## Handling pan gestures

Let's spice things a bit by making the circle draggable and have it bounce back to it's staring position when released. Let's also keep the color highlight and scale effect we've added in the previous example. Implementing this behavior it's not possible with just a simple tap gesture. We need to reach for a pan gesture instead.

Luckily, all the gestures share a similar API so implementing this is nearly as easy as renaming the `Tap` gesture to `Pan` and chaining an additional `onChange` method.

import PanGesture from '@site/src/examples/HandlingGestures/PanGesture';
import PanGestureSrc from '!!raw-loader!@site/src/examples/HandlingGestures/PanGesture';

<CollapsibleCode showLines={[17, 33]} src={PanGestureSrc} />

The callback passed to `onChange` comes with some [event data](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/pan-gesture#event-data) that has a bunch of handy properties. One of them is `translationX` which indicates how much the object has moved on the X axis. We stored that in a shared value to move the circle accordingly. To make the circle come back to initial place all you have to do is to reset the `offset.value` in the `onFinalize` method. We can use `withSpring` or `withTiming` functions to make it come back with an animation.

All that's left to do is to adjust the logic in `useAnimatedStyle` to handle the offset.

<CollapsibleCode showLines={[35, 43]} src={PanGestureSrc} />

You can play around with the example below and see how the circle changes and reacts to the gesture:

<InteractiveExample
  src={PanGestureSrc}
  component={<PanGesture />}
  label="Grab and drag the circle"
/>

## Using `withDecay`

Remember when some time ago we said that we'll come back to `withDecay`? Now this is the time!

`withDecay` lets you retain the velocity of the gesture and animate with some deceleration. That means when you release a grabbed object with some velocity you can slowly bring it to stop. Sounds complicated but it really isn't!

Simply pass the final velocity in `onFinalize` method to the `velocity` property of `withDecay` function and let Reanimated handle it for you. To retain the new position of an object update the change on the X axis in `onChange` method like so:

import DecayBasic from '@site/src/examples/DecayBasic';
import DecayBasicSrc from '!!raw-loader!@site/src/examples/DecayBasic';

<CollapsibleCode showLines={[23, 36]} src={DecayBasicSrc} />

The rest of the code is just to make sure the square stays inside the screen.

Play around and see how the square decelerates when let go with some speed!

<InteractiveExample
  src={DecayBasicSrc}
  component={<DecayBasic />}
  label="Grab and release the square"
/>

Make sure to check check the full [`withDecay` API reference](/docs/animations/withDecay) to get to know rest of the configuration options.

## Summary

In this section, we went through basics of handling gestures with Reanimated and Gesture Handler. We learned about `Tap` and `Pan` gestures and `withDecay` function. To sum up:

- Reanimated integrates with a different package called React Native Gesture Handler to provide seamless interactions.
- We create new gestures, such as `Gesture.Pan()` or `Gesture.Tap()`, and pass them to `GestureDetector`, which have to wrap the element we want to handle interactions on.
- You can access and modify shared values inside gesture callbacks without any additional boilerplate.
- `withDecay` lets you create decelerating animations based on velocity coming from a gesture.

## What's next?

In this article, we've barely scratched the surface of what's possible with gestures in Reanimated. Besides [Tap](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/tap-gesture) and [Pan](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/pan-gesture) gestures Gesture Handler comes with many more e.g. [Pinch](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/pinch-gesture) or [Fling](https://docs.swmansion.com/react-native-gesture-handler/docs/api/gestures/fling-gesture). We welcome you to dive into the [Quick start](https://docs.swmansion.com/react-native-gesture-handler/docs/quickstart) section of the React Native Gesture Handler documentation and explore all the possibilities that this library comes with.

In [the next section](/docs/fundamentals/customizing-animation), we'll learn more about animating colors.
