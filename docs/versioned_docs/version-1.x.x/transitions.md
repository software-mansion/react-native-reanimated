---
id: transitions
title: Transitions
sidebar_label: Transitions
---

Transitions is an experimental API distributed as a part of reanimated which serves the purpose of animating between two states of view hierarchy. It is conceptually similar to `LayoutAnimation` concept from react native but gives much better control of what and how is going to be animated.

Transitions API consists of two main building blocks. First one being `Transitioning.View` which is an extension of regular react-native view, so you can use any `View` props you'd like. The `Transitioning.View` is a root of all the transition animations that will be happening and is used to scope the changes to its children. In order to have next transition animated you'd need to call `animateNextTransition()` on the `Transitioning.View` instance.

The second main building block is transition definition. Transitioning API uses JSX syntax that allows you to define how the transition animation should perform. You can use all the components from `Transition` object to combine the animation you want. Please see the below list for the documentation of transition components.

## Transition groups

The below set of components can be used to group one or more transitions. You can also nest transition groups in order to achieve desirable effects.

### `<Transition.Together>`

Transitions nested under this component will run in parallel when the animation starts.

### `<Transition.Sequence>`

Transitions nested under this component will run in sequence in the order at which they are listed

## Transitions

Transition components can be used separately or as a part of a group. Each transition component has the following common properties you can use to configure the animation:

#### `durationMs`

The time animation takes to execute in milliseconds

#### `delayMs`

Use this if you want the animation to start delayed (value in milliseconds)

#### `interpolation`

Specify the transition timing curve. Possible values are: `linear`, `easeIn`, `easeOut`, `easeInOut`

#### `propagation`

Allows for the framework to automatically delay beginning of transitions across a set of different views depending on their position. The possible values are `top`, `bottom`, `left` and `right`. When `propagation="top"` it means that the first element that will start animating is the one that is closest to the top of `Transitioning.View` container, then the other views will be delayed by the amount which depends on their distance from the top edge.

### `<Transition.In>`

Allows to specify how views that get mounted during animation transition get animated. In addition to the above parameters you can specify the type of animation using `type` prop. The possible values are: `fade`, `scale`, `slide-top`, `slide-bottom`, `slide-left`, `slide-right`.

### `<Transition.Out>`

Allows to specify how the framework should animate views that are being removed during transition. In addition to the above parameters you can specify the type of animation using `type` prop. The possible values are: `fade`, `scale`, `slide-top`, `slide-bottom`, `slide-left`, `slide-right`.

### `<Transition.Change>`

Use `Transition.Change` component to specify how components' which properties get changed during transition should be animated. The framework currently supports an animating position, bounds and transforms.

## How to use it

This API is still experimental and is a subject to change. Please refer to our [Example app](https://github.com/software-mansion/react-native-reanimated/tree/main/Example/reanimated1/transitions) to see how it can be used in practice in the current shape.
