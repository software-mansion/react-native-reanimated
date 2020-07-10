---
id: animations
title: Animations
sidebar_label: Animations
---

Animations are first-class citizens in Reanimated 2.
The library comes bundled with a number of animation helper methods that makes it very easy to go from immediate property updates into an animated ones.

In the previous article about [Shared Values](shared-values) we learned about `useAnimatedStyle` hook, that allows for creating an association between Reanimated code and view properties.
We also learned how to perform animated transitions of Shared Values.
This, however, is not the only way how animations can be started.
On top of that Reanimated provides a number of animation modifiers and ways how animations can be customized.
In this arcitle we explore this and other methods that can be used to perform animated view updates.

## Shared Value Animated Transitions

One of the easiest ways of starting an animation in Reanimated 2, is by making an animated transition of a Shared Value.
Animated Shared Value updates require just a tiny change compared to immadiate change.
Let us recall the example from the previous article, where we'd update a Shared Value with some random number on every button tap:

```js {13}
function Box() {
  const offset = useSharedValue(0);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value * 255 }],
    };
  });

  return (
    <>
      <Animated.View style={[styles.box, animatedStyles]} />
      <Button onPress={() => (offset.value = Math.random())} title="Move" />
    </>
  );
}
```

In the above example we make immediate updates to the `offset` Shared Value upon a button click.
The `offset` value is then mapped to a veiw translation using `useAnimatedStyle`.
As a result, when we tap on the "Move" button the animated box jumps to a new, random location as presented below:

![](/react-native-reanimated/docs/shared-values/sv-immediate.gif)

With Reanimated 2, such Shared Value updates can be transformed to an animated updates by wrapping the target value using one of the animation helpers, e.g., [`withTiming`](api/withTiming) or [`withSpring`](api/widthSpring).
The only change that we can do now is to wrap random offset value in `withSpring` call as shown below:

```js {3}
<Button
  onPress={() => {
    offset.value = withSpring(Math.random());
  }}
  title="Move"
/>
```

This way, instead of assigning a number to Shared Value, we make an animation object which is then used to run updates on the Shared Value until it reaches the final value.
As a result the `offset` Shared Value transitions smoothly between the current and the newly assigned random number, which results in a nice spring-based animation in between those states:

![](/react-native-reanimated/docs/shared-values/sv-spring.gif)

## Animations in `useAnimatedStyle` hook

Animated Shared Value transitions are not the only way to initiate and run animations.
It if often the case that we'd like to animated properties that are not directly mapped onto a Shared Value.
For that, in Reanimated we allow for animations to be specified directly in [`useAnimatedStyle`](api/useAnimatedStyle) hook.
In order to do this you can use the same animation helper methods from Reanimated API, but instead of using it when updating a Shared Value, you can use it to wrap the style value property.

```js {5}
const animatedStyles = useAnimatedStyle(() => {
  return {
    transform: [
      {
        translateX: withSpring(offset.value * 255),
      },
    ],
  };
});
```

As you can see, the only change compared to the example from the previous section is that we wrapped value provided to `translateX` offset in `withSpring` call.
This tells Reanimated engine that all updates made to `translateX` offset should be animated using spring.
With this change added, we no longer need to animate the `offset` Shared Value updates, and can keep those updates being "immediate":

```js
<Button onPress={() => (offset.value = Math.random())} title="Move" />
```

As a result we will get the exact same behavior as when we'd animate the `offset` value update.
However, in this case we move the control over how value updates need to be performed from the place where we make Shared Value amends to the place where we define the View styles.
This approach is more convinient in many cases, especially when view properties are derived from Shared Value as opposed to the Shared Value being direcly mapped to given styles.
Also, keeping all the aspects of view styles and transitions often makes it easier to keep control over your component's code, as it forces you to have everything defined in one place vs scattered around the codebase allowing for animated transitions being triggered from anywhere.

## Interrupting Animated Updates

Animated UI updates, by definition, take time to perform.
It is often undesirable to freeze user interactions with the App and wait for transitions to finish.
While allowing the user to interact with the screen while style properties are being animated, the framework needs to support a way for those animations to be interrupted or reconfigured as they go.
This is the case for Reanimated animations API as well.
Whenever you make animated updates of Shared Values, or you specify animations in `useAnimatedStyle` hook, those animations are fully interruptible.
In the former case, when you make an update to Shared Value that is being animated, the framework won't wait for the previous animation to finish, but will immediately initiate new transition starting from the current position of the previous animation.
Interruptions also work correctly for animations defined in `useAnimatedStyle` hook.
When the style is updated and the target value for a given property has changed compared to the last time when the style hook was run, the new animation will launch immediately starting from the current position of the property.

We believe that the described behavior when it comes to interruptions is desirable in majority of the usecases, and hence we made it the default.
In case you'd like to wait with the next animation until the previous one is finished, or in the case you'd like to cancel currently running animation prior to starting a new one, you can still do it using animation callbacks in the former, or [`cancelAnimation`](api/cancelAnimation) method in the latter case.

To illustrate how interruptions perform in practice, please take a look at the below video, where we run the example presented earlier, but make much more frequent taps on the button in order to trigger value changes before the animation settles:

![](/react-native-reanimated/docs/shared-values/sv-interruption.gif)

## Customizing Animations

Reanimated currenty provides two built-in animation helpers: [`withTiming`](api/withTiming) and [`withSpring`](api/widthSpring).
As there are ways of expanding that with your own, custom animations (animation helpers are built on top of the [worklets](worklets) abstraction), we are not yet ready to document that as we still plan some changes of that part of the API.
However, the built-in methods along with the animation modifiers (that we discuss later on), already provides a great flexibility.
Below we discuss some of the most common configuration options of the animation helpers, and we refer to the documentation page of [`withTiming`](api/withTiming) and [`withSpring`](api/widthSpring) for the complete set of parameters.

Both animation helper methods share a similar structure.
They take target value as the first parameter, configuration object as the second, and finally a callback method as the last parameter.
Starting from the end, callback is a method that runs when the animation is finished, or when the animation is interrupted/cancelled.
Callback is run with a single argument – a boolean indicating whether the animation has finished executing without cancellation:

```js
<Button
  onPress={() => {
    offset.value = withSpring(Math.random(), {}, (finished) => {
      if (finished) {
        console.log("ANIMATION ENDED");
      } else {
        console.log("ANIMATION GOT CANCELLED");
      }
    });
  }}
  title="Move"
/>
```

### Timing

As it comes to the configuration options, those are different depending on the animation we run.
For timing-based animations, we can provide a duration and an easing method.
The easing parameter allows to control how fast the animation progresses along the specified time duration.
You may wish for the animation to accelerate fast and then slow down towards the end, or to start slowly, then accelerate and slow down again at the end.
Easing can be described using [bezier curve](https://javascript.info/bezier-curve) thanks to `Easing.bezier` method exported from Reanimated package.
But in most of the cases it is enough to use `Easing.in`, `Easing.out` or `Easing.inOut` to adjust the timing curve at the start, end or at the moth ends respectively.
The default duration for the timing animation is 300ms, and the default easing is an in-out quadratic curve (`Easing.inOut(Easing.quad)`):

![](/react-native-reanimated/docs/animations/easeInOutQuad.png)

Here is how to start a timing animation with a custom configuration:

```js {4-5}
import { Easing, withTiming } from 'react-native-reanimated';

offset.value = withTiming(0, {
  duration: 500,
  easing: Easing.out(Easing.exp),
});
```

You may want to visit [easings.net](https://easings.net/) and check various easing visualizations.
To learn how to apply these please refer to [Easing.js](https://github.com/software-mansion/react-native-reanimated/blob/master/src/reanimated2/Easing.js) file where all the easing related helper methods are defined.

### Spring

Unlike timing, spring-based animation does not take a duration as parameter.
Instead the time it takes for the spring to run is determined by the spring physics (which is configurable), initial velocity, and the distance to travel.
Below we show an example of how a custom spring animation can be defined and how it compares to the default spring settings.
Please review [`withSpring`](api/withSpring) documentation for the complete list of configurable options.

```js
import {
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  Animated,
} from 'react-native-reanimated';

function Box() {
  const offset = useSharedValue(0);

  const defaultSpringStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(offset.value * 255) }],
    };
  });

  const customSpringStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withSpring(offset.value * 255, {
            damping: 20,
            stiffness: 90,
          }),
        },
      ],
    };
  });

  return (
    <>
      <Animated.View style={[styles.box, defaultSpringStyles]} />
      <Animated.View style={[styles.box, customSpringStyles]} />
      <Button onPress={() => (offset.value = Math.random())} title="Move" />
    </>
  );
}
```

[GIF]

Unlike in the previous example, here we define animation in `useAnimatedStyle` hook.
This makes it possible to use a single Shared Value but map that to a two View's styles.

## Animation Modifiers

On top of the animation helper customization, another way to control animations are so-called animation modifiers.
Currently, Reanimated exposes two modifiers: [`delay`](api/delay) and [`loop`](api/loop).
As the name suggest, the former modifies the provided animation such that it starts with a given delay, while the latter make the provided animation run back and forth.
Modifiers take animation object with optional configuration as an input, and return a modified animation object.
This makes it possible to wrap existing animation helpers (or custom helpers) or make a chain of modifiers when necessary.
Please refer to the documentation of each of the helper methods to learn about the ways how they can be parameterized.

To demonstrate `loop` modifier in action, we will recreate a wobble effect on the blue rectange from the previous demos.
In order



## Animating Layout Properties



## Animating Non-Style Properties

