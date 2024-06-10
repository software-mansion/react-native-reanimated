---
slug: /
title: About React Native Reanimated
sidebar_label: About
---

:::caution

Reanimated v2 only supports `react-native` `0.62+`

:::

Reanimated is a React Native library that allows for creating smooth animations and interactions that runs on the UI thread.

### Motivation

In React Native apps, the application code is executed outside of the application's main thread.
This is one of the key elements of React Native's architecture and helps with preventing frame drops in cases where JavaScript has some heavy work to do.
Unfortunately this design does not play well when it comes to event driven interactions.
When interacting with a touch screen, the user expects effects on screen to be immediate.
If updates are happening in a separate thread it is often the case that changes done in the JavaScript thread cannot be reflected in the same frame.
In React Native by default all updates are delayed by at least one frame as the communication between the UI and JavaScript threads is asynchronous and the UI thread never waits for the JavaScript thread to finish processing events.
On top of the lag with JavaScript playing many roles like running react diffing and updates, executing app's business logic, processing network requests, etc., it is often the case that events can't be immediately processed thus causing even more significant delays.
Reanimated aims to provide ways of offloading animation and event handling logic off of the JavaScript thread and onto the UI thread.
This is achieved by defining Reanimated worklets – tiny chunks of JavaScript code that can be moved to a separate JavaScript VM and executed synchronously on the UI thread.
This makes it possible to respond to touch events immediately and update the UI within the same frame when the event happens without worrying about the load that is put on the main JavaScript thread.

### Library overview

Version 1 of Reanimated has been designed to match React Native's Animated API while providing a more complete set of primitives for defining interactions.
In version 2 we decided to change the approach in order to address some limitations of version 1 that come from the declarative API design.
Below we present an overview of things that are new in Reanimated 2 and different from Reanimated 1.
This is a tl;dr of the remaining parts of the documentation.
We recommend that you check the full articles to learn the details about each of the listed aspects:

1. interactions and animations are no longer written using an unintuitive declarative API, instead they can be written in pure JS, in the form of so-called "worklets".
   Worklets are pieces of JS code that we extract from the main React Native code and run in a separate JS context on the main thread.
   Because of that, worklets have some limitations as to what part of the JS context they can access (we don't want to load the entire JS bundle into the context which runs on the UI thread).
2. It is still possible to define and pass around "Animated Values", however thanks to the new API, we expect that you'll create much fewer of those for a single animation.
   Also, now, they are actually called "Shared Values" and can carry not only primitive types but also arrays, objects and functions.
3. Shared Values are no longer directly connected to view props.
   Instead, we expose a `useAnimatedStyle` hook that returns a style object which can be passed as a View's style param.
   The `useAnimatedStyle` hook takes a worklet that, when executed, should return styles that will be applied to the connected View.
   The style worklet will update whenever shared values used by that worklet change (we detect dependencies on shared values automatically).
4. Animations can be started in two ways: by triggering animated change on a shared value, or by returning animated value from `useAnimatedStyle` hook.
5. With reanimated, we can hook worklets to serve as event handlers.
   Most common case for an event worklet is to modify some shared values.
   As a result, changes made to those values will be reflected in the animated style worklet being triggered, which in turn will result in some view properties being updated.
   For convenience, Reanimated provides an event hook that is tailored to work together with Gesture Handler library and allows you to define a separate worklet for handling different handler states (e.g., onStart, onActive, etc.)

### Known problems and limitations

Reanimated 2 is in an early version.
As we wanted to share it with the community as soon as we could, the library still has some rough edges and limitations that we plan to address soon.
Unfortunately some of the limitations come from the immaturity of React Native's TurboModule architecture that Reanimated 2 relies on.
As a consequence we won't be able to support older versions of React Native and some issues that we yet plan to resolve may require full support of TurboModules which is not yet available to the public.

Below we highlight some of the problems that we are aware of (in most cases we are actively working on improving these):

- As the library uses JSI for synchronous native methods access, remote debugging is no longer possible.
  You can use Flipper for debugging your JS code, however connecting the debugger to the JS context which runs on the UI thread is not currently supported.
- Objects passed to worklets from React Native don't have the correct prototype set in JavaScript.
  As a result, such objects aren't enumerable, that is you can't use "for in" constructs, spread operator (three dots), or functions like Object.assign with them.
- With Reanimated you can't animate virtual components of a layout. For example, you can’t animate nested `<Text>` components because React Native changes
  ```
  <Text>
     string1
     <Text>string2</Text>
  </Text>
  ```
  to
  ```
  <RCTTextView>
     string1
     <RCTVirtualText>string2</RCTVirtualText>
  </RCTTextView>
  ```
  and `RCTVirtualText` is a virtual component.

### Sponsors

We really appreciate our sponsors! Thanks to them we can develop our library and make the React Native world a better place. Special thanks for:

<div class="community-holder-container">

  <div class="community-holder-container-item">
    <a href="https://www.shopify.com/">
      <img class="community-imageHolder" src="https://avatars1.githubusercontent.com/u/8085?v=3&s=100" />
      <div>Shopify</div>
    </a>
  </div>

  <div class="community-holder-container-item">
    <a href="https://expo.dev">
    <img class="community-imageHolder" src="https://avatars2.githubusercontent.com/u/12504344?v=3&s=100" />
    <div>Expo</div>
    </a>
  </div>

</div>
