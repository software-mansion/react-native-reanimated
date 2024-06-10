---
id: clock
title: Clock
sidebar_label: Clock
---

Original `Animated` API makes an "animation" object a first class citizen.
`Animation` object has many features and therefore requires quite a few JS<->Native bridge methods to be managed properly.
In `react-native-reanimated`, clocks aim to replace that by providing more of a low level abstraction but also since clock nodes behave much like the animated values they make the implementation much less complex.

`Animated.Clock` node is a special type of `Animated.Value` that can be updated in each frame to the timestamp of the current frame. When we take `Clock` node as an input, the value it returns is the current frame timestamp in milliseconds. Using special methods, clock nodes can be stopped and started and we can also test if clock has been started.

Because `Animated.Clock` just extends the `Animated.Value` you can use it in the same places (operations) where you can pass any type of animated node.
