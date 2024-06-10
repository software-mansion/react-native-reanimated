---
slug: slider
title: Slider
---

Slider allows users to adjust a value or control a setting by sliding a handle along a track. It is commonly used to adjust settings such as volume, brightness, or in this case, the width of a box.

import Slider from '@site/static/examples/Slider';
import SliderSrc from '!!raw-loader!@site/static/examples/Slider';
import ExampleVideo from '@site/src/components/ExampleVideo';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

<InteractiveExample src={SliderSrc} component={Slider} />

We use the `useSharedValue` hook to store the offset of the slider handle, allowing for smooth animation during sliding.

<CollapsibleCode src={SliderSrc} showLines={[18,18]}/>

This example is done using [Pan gesture](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture) from `react-native-gesture-handler` library. It adjusts the handle's position and width of the box accordingly to the current offset. The offset is a [shared value](/docs/fundamentals/glossary#shared-value) and is updated during the `onChange` event of the pan gesture.

<samp id="Slider">Slider</samp>

<CollapsibleCode src={SliderSrc} showLines={[28,41]}/>

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/slider_android.mov",
    ios: "/react-native-reanimated/recordings/examples/slider_ios.mov"
  }}
/>

The `useAnimatedStyle` hook is used to create animated styles for both the box and the slider handle. This ensures that changes to the offset value result in smooth animations for both components.

<samp id="Slider">Slider</samp>

<CollapsibleCode src={SliderSrc} showLines={[40,50]}/>

The text change regarding current width of the box doesn't run on UI thread so we used [runOnJS](/docs/threading/runOnJS/). The `runOnJS()` function ensures that the state update for the box width occurs on the JavaScript thread, maintaining smooth animations without unnecessary re-renders.

<samp id="Slider">Slider</samp>

<CollapsibleCode src={SliderSrc} showLines={[22,25]}/>
