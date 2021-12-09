---
slug: /
title: About React Native Reanimated
sidebar_label: About
---

React Native's Animated library reimplemented.

- **Native Performance**: Declare your animations in JS, but have them run on the native thread! 🧙‍♂️
- **Precise Animations**: The API affords new levels of precision and detailed control of your animations. 🕹
- **(mostly) Backwards Compatible**: Use the same Animated API from React Native that you've been using. You generally don't _need_ to change anything to get started. 👍

Reanimated provides a more comprehensive, low level abstraction for the Animated library API, giving you much greater flexibility, control and performance. Combine it with [react-native-gesture-handler](https://github.com/kmagiera/react-native-gesture-handler) for performant gesture-based interactions.

### Motivation

`Animated` library has several limitations that become troubling when it comes to gesture based interactions.
This project was initially created to resolve the issue of pan interaction when the object can be dragged along the screen and when released it should snap to some place on the screen.
The problem was that despite using `Animated.event` and mapping gesture state to the position of the box, and making this whole interaction run on UI thread with `useNativeDriver` flag, we still had to call back into JS at the end of the gesture for us to start "snap" animation.
This is because `Animated.spring({}).start()` cannot be used in a "declarative" manner, because when it gets executed it has a "side effect" of starting a process (an animation) that updates the value for some time.
Adding "side effect" nodes into the current Animated implementation turned out to be a pretty difficult task as the execution model of the Animated API runs all the dependent nodes of each frame for the views that need to update.
We don't want to run "side effects" more often than necessary as it would, for example, result in the animation starting multiple times.

Another inspiration to redesigning the internals of `Animated` was Krzysztof's work on porting "Animated Tracking" functionality to the native driver.
Apparently, even though the native driver is out for quite a while, it still does not support all the things non-native `Animated` lib can do.
Obviously, it is far more difficult to build three versions of each feature (JS, Android and iOS) instead of one, and the same applies for fixing bugs.
One of the goals of `react-native-reanimated` was to provide a more generic building block for the API that would allow for building more complex features only in JS and make the native codebase as minimal as possible.
Taking "diffClamp" node as an example, it is currently implemented in three different places in `Animated` core and even though it is pretty useful it actually only has one use case (collapsible scrollview header).

On a similar topic, there's React Native's PR [#18029](https://github.com/facebook/react-native/pull/18029) and even though it provides a legitimate use case, maintainers are hesitant about merging it. The `Animated` API shouldn't block people from building things like this and the goal of `react-native-reanimated` is to provide lower level access that would allow for implementing that and many more features with no necessary changes to the core of the library.

You can watch Krzysztof Magiera's [React Europe talk](https://www.youtube.com/watch?v=kdq4z2708VM) where he explains the motivation.

The goals:

- More generic primitive node types leading to more code reuse for the library internals therefore making it easier to add new features and fix bugs.
- The new set of base nodes can be used to implement `Animated` compatible API including:
  - Complex nodes such as “diffClamp”.
  - Interactions such as animated value tracking or animation staggering.
- Conditional evaluation & nodes with side effects (`set`, `startClock`, `stopClock`).
- No more “useNativeDriver” – all animations runs on the UI thread by default

### Reanimated overview

We aim to bring this project to be fully compatible with `Animated` API. We believe that the set of base nodes we have selected should make this possible to be done only by writing JS code and does not require significant changes in the native codebases. Here is a list of things that haven't yet been ported from the original version of `Animated` library.
All the functionality that missing elements provide in `Animated` can already be achieved with `react-native-reanimated` although a different methodology for implementing those may be required (e.g. check ["Declarative Animation API" section](declarative.md) to see how the implementation may differ).

- using value offsets
- value tracking (can be achieved in different way, `react-native-reanimated` also allows for tracking all the animation parameters not only destination params)
- animation staggering
- animation delays

### At most once evaluation (the algorithm)

Unlike the original `Animated` library where each node could have been evaluated many times within a single frame, `react-native-reanimated` restricts each node to be evaluated at most once in a frame.
This restriction is required for nodes that have side-effects to be used (e.g. [`set`](nodes/set.md) or [`startClock`](nodes/startClock.md)).
When node is evaluated (e.g. in case of an [`add`](nodes/add.md) node we want to get a sum of the input nodes) its value is cached. If within the next frame there are other nodes that want to use the output of that node instead of evaluating we return cached value.
This notion also helps with performance as we can try to evaluate as few nodes as expected.
The current algorithm for making decisions of which nodes to evaluate works as follows:

1.  For each frame we first analyze the generated events (e.g. touch stream). It is possible that events may update some animated values.
2.  Then we update values that correspond to [clock](clock.md) nodes that are "running".
3.  We traverse the node's tree starting from the nodes that have been updated in the current cycle and we look for final nodes that are connected to views.
4.  If we found nodes connected to view properties we evaluate them. This can recursively trigger an evaluation for their input nodes etc.
5.  After everything is done we check if some "running" clocks exists. If so we enqueue a callback to be evaluated with the next frame and start over from pt 1. Otherwise we do nothing.

### 100% declarative gesture interactions

`react-native-reanimated` works best with the [Gesture Handler](https://kmagiera.github.io/react-native-gesture-handler)
library. Currently all the examples are made using that library, including the ultimate
[ImagePreview app](https://github.com/software-mansion/react-native-reanimated/blob/main/Example/src/imageViewer).
