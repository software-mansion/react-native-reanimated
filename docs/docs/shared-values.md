---
id: shared-values
title: Shared Values
sidebar_label: Shared Values
---

Shared Values are among fundamental concepts behind Reanimated 2.0.
If you are familiar with React Native's [Animated API](https://reactnative.dev/docs/animated) you can compare them to `Animated.Values`.
They serve a similar purpose of carrying "animateable" data, providing notion of reactiveness, and driving animations.
We will discuss each of those key roles of shared values in sections below.
At the end we present a brief overview of the differences between shared values and `Animated.Value` for the readers familiar with the `Animated` API.

## Carrying data

One of the primary goals of shared values (hence their name) is to provide a notion of shared memory in Reanimated 2.0.
As you might've learned in the article about [worklets](worklets), Reanimated 2.0 runs animation code in a separate thread using separate JS VM.
Share Values makes it possible to maintain a reference to a mutable data that can be read and modified securely across those threads.

Shared value object seve as a reference to pieces of shared data that can be accessed and modified using `.value` property.
It is important to remember that whether you want to access or update shared data, you should use `.value` property (one of the most common source of mistakes is trying to read using shared value reference directly).

In order to provide secure and fast ways of acessing shared data across two threads, we had to make some tradeoffs when designing shared values.
As, during animations, updates most of the time happen on the UI thread, shared values are optimized to be updated and read from the UI thread.
Hence, read and writes done from the UI thread are all synchronous, and does not involve any cross-thread locking.
As a consequence, updates done on the React Native thread are asynchronous.
At the moment we do not support ways of reading the shared value from the React Native JS thread (we will add a way to read and subscribe to updates soon).
Because of that you should avoid reading from `.value` property, as it may contain stale data (as shared value reads on the React Native JS thread can only be asynchronous, we will likely throw on an attempt of reading the value property, this has not yet been implemented though).

In order to create a shared value reference, you should use `useSharedValue` hook:

```js
const sharedVal = useSharedValue(3.1415)
```

The shared value constructor hook takes a single argument which is the initial payload of the shared value.
This can be any primitive or nested data like object, array, number, string or boolean.

In order to update shared value from the React Native thread or from worklet (running on UI thread) you should set a new value onto the `.value` property.

```js {2,5}
function SomeComponent() {
  const sharedVal = useSharedValue(0);
  return (
    <Button
      onPress={() => (sharedVal.value = Math.random())}
      title="Randomize"
    />
  );
}
```

In the above example we update value asynchronously from the React Native JS thread.
Updates can be done synchronously when making them from within a worklet, like so:

```js {3,7}
function SomeComponent({ children }) {

  const scrollOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  return (
    <Animated.ScrollView onScroll={scrollHandler}>
      {children}
    </Animated.ScrollView>
  );
}
```

In the above example scroll handler is a worklet and runs the scroll event logic on the UI thread.
Updates made in that worklets are synchronous.

## Reactiveness with Shared Values

Second most important aspect of Shared Values is that they provide a notion of reactiveness to Reanimated framework.
By that, we mean that updates made to shared values can trigger corresponding code execution on the UI thread, that can further result in starting animations, view updates, etc.

Reactiveness layer has been designed to be fully transparent from the developer perspective.
It is based on the concept of shared values being captured by reactive worklets (called internally "mapper worklets").


## Shared Values vs Animated.Value

In this section we present a short summary of the differences between Shared Values and Animated.Values.
The goal of this comparison is not to point out weaknesses of one solution over the other, but to provide a condensed reference for people familiar with `Animated`.
If you are confused about some aspects of shared values and expect them to work similarily to Animated Values please let us know and we will add that to the list.

What | Animated Value | Shared Value
---| --- | ---
Payload |  Only numeric and string values are supported | Any primitive or nested data structures (like objects, arrays, strings, numbers, booleans)
Conecting with View's props | By passing `Animated.Value` directly as a prop | Shared Values cannot be directly hooked as View's props. You should use `useAnimatedStyle` or `useAnimatedProps` where you can access shared values and return them as selected styles/props
Updating values | Using `value.setValue` method (which is an async call when the value is using native driver) | By updating `.value` property. Updating `.value` is sync when running on UI thread, or async when running on the React Native JS thread.
