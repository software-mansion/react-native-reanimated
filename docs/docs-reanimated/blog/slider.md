---
slug: slider
title: Slider
---

Slider allows users to adjust a value or control a setting by sliding a handle along a track. It is commonly used to adjust settings such as volume, brightness, or in this case, the width of a box.

import Slider from '@site/static/examples/Slider';
import SliderSrc from '!!raw-loader!@site/static/examples/Slider';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

<InteractiveExample src={SliderSrc} component={Slider} />

We use the `useSharedValue` hook to store the offset of the slider handle, allowing for smooth animation during sliding.

<CollapsibleCode src={SliderSrc} showLines={[24,24]}/>

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

<CollapsibleCode src={SliderSrc} showLines={[42,52]}/>

Leveraging animated props allows us to run them on the UI thread instead of the JS thread. To prevent unnecessary re-renders when the text displaying the current width of the box changes, we used the `useAnimatedProps` hook.

Additionally, we opted for **TextInput** instead of **Text** because **TextInput** has a `text` property that can be animated, whereas **Text** only has children.

This approach also enabled us to animate **TextInput** using [shared values](/docs/fundamentals/glossary#shared-value).

<samp id="Slider">Slider</samp>

<CollapsibleCode src={SliderSrc} showLines={[58,63]}/>
