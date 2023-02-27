---
slug: /
title: About React Native Reanimated
sidebar_label: About
---

:::info

This is a documentation website of Reanimated 3.x release.

Looking for an older version? Check the [Reanimated 2.x](/docs/2.x/) or [Reanimated 1.x](/docs/1.x/).

:::

:::caution

Reanimated **3.0.0** supports `react-native` `0.64+`. Subsequent releases aim to support [3 last stable React Native versions](https://github.com/reactwg/react-native-releases#which-versions-are-currently-supported).

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

### Overview of Reanimated 3.x

The developments of Reanimated 3 were focused on improving the stability and performance. This version uses the Reanimated v2 API you know and love continuously embracing worklets and shared value architecture.

It comes with a full rewrite of the [Shared Value mechanism](shared-values.md) and [Layout Animations](layout_animations.md) and the introduction of Shared Element Transitions of which we're really excited about.

Alongside many improvements and features Reanimated 3.x also introduces support for the [New Architecture](https://reactnative.dev/docs/new-architecture-intro). In order to make that happen we had to drop the support for Reanimated v1 API. When your application (or a library that you're using) uses Reanimated v1 API it won't work with Reanimated 3.x anymore.

### Known problems and limitations

Below we highlight some of the problems that we are aware of:

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
