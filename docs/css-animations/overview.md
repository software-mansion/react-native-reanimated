# Overview

CSS animations let you play a sequence of style keyframes over time. Unlike a transition, which animates a single change from one value to another, an animation follows a timeline you define. It can run through multiple steps, repeat, and even start on its own. If you've written `@keyframes` in CSS on the web, you already know the idea.

## Your first animation

Let's make a box that gently pulses forever. We define a set of *keyframes* that describe how the box looks at each step, then tell Reanimated how long one cycle should last.

The heart of the animation is a keyframes object and a duration:

```jsx
const pulse = {
  from: {
    transform: [{ scale: 0.8 }, { rotateZ: '-15deg' }],
  },
  to: {
    transform: [{ scale: 1.2 }, { rotateZ: '15deg' }],
  },
};

function App() {
  return (
    <Animated.View
      style={{
        // highlight-start
        animationName: pulse,
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
        animationDirection: 'alternate',
        // highlight-end
      }}
    />
  );
}
```

There's no button and no state here - the animation starts as soon as the component mounts, and it keeps going because `animationIterationCount` is set to `'infinite'`.

## How it works

You describe an animation in two parts:

1. **Keyframes** - [`animationName`](/docs/css-animations/animation-name) takes an object that maps offsets (`from`, `to`, or percentages like `50%`) to the styles at that point in the timeline.
2. **Timing** - properties like [`animationDuration`](/docs/css-animations/animation-duration), [`animationIterationCount`](/docs/css-animations/animation-iteration-count), and [`animationDirection`](/docs/css-animations/animation-direction) control how that timeline plays.

Reanimated interpolates between your keyframes and plays them back on the timeline you set.

Passing an object to a prop called `animationName` might look surprising at first. The name comes from CSS on the web, where you declare keyframes under a named `@keyframes` rule and then reference that name from the `animation-name` property. React Native has no global stylesheet to hold named rules, so instead of a name you pass the keyframes object directly to `animationName`.

Not every style property can be animated. See [Supported style properties](/docs/guides/supported-properties) for the full list and where each one works.

> **Info**
>
> You can define keyframes inline, or pull them out into a separate variable and reuse the same animation across several components. See [`animationName`](/docs/css-animations/animation-name) for all the ways to define keyframes.

This is the main difference from a [CSS transition](/docs/css-transitions/overview): a transition animates a single change from A to B when a value changes, while an animation follows a defined, repeatable timeline.

## When should I use CSS animations?

Use CSS animations for self-contained, declarative motion: loading spinners, pulsing badges, looping attention-grabbers, or any multi-step animation that plays on its own. Like transitions, this is the recommended starting point for most animations.

When you need frame-by-frame control (gesture-driven or scroll-driven motion, or animations orchestrated from live values), reach for the shared values API with [`useAnimatedStyle`](/docs/core/useAnimatedStyle).

## Summary

* A CSS animation plays a sequence of keyframes over a timeline you define.
* Describe the steps with [`animationName`](/docs/css-animations/animation-name) and control playback with properties like [`animationDuration`](/docs/css-animations/animation-duration) and [`animationIterationCount`](/docs/css-animations/animation-iteration-count).
* Animations can loop and start on mount, unlike transitions, which run once per change.
* Use CSS animations for declarative, self-running motion, and [`useAnimatedStyle`](/docs/core/useAnimatedStyle) for interactive, value-driven animations.

## What's next?

Explore the properties that shape your animations:

* [`animationName`](/docs/css-animations/animation-name)
* [`animationDuration`](/docs/css-animations/animation-duration)
* [`animationTimingFunction`](/docs/css-animations/animation-timing-function)
* [`animationDelay`](/docs/css-animations/animation-delay)
* [`animationIterationCount`](/docs/css-animations/animation-iteration-count)
* [`animationDirection`](/docs/css-animations/animation-direction)
* [`animationFillMode`](/docs/css-animations/animation-fill-mode)
* [`animationPlayState`](/docs/css-animations/animation-play-state)

Animating something in response to a state change instead? See [CSS Transitions](/docs/css-transitions/overview).
