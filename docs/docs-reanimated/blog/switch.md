---
slug: switch
title: Switch
---

A switch element is a user interface component that allows users to toggle between two or more states. It is commonly used to turn on/off a setting, enable/disable a feature, or select between options.

import Switch from '@site/static/examples/Switch';
import SwitchSrc from '!!raw-loader!@site/static/examples/Switch';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

<InteractiveExample src={SwitchSrc} component={Switch} />

The following implementation of a switch relies on [animatable values](/docs/fundamentals/glossary#animatable-value). Leveraging animatable values of color and position enables smooth transition between the two states.

<samp id="Switch">Switch</samp>

<CollapsibleCode src={SwitchSrc} showLines={[26,52]}/>

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/switch_android.mp4",
    ios: "/react-native-reanimated/recordings/examples/switch_ios.mov"
  }}
/>

We use the `useSharedValue` hook to store the dimensions of the element, which allows for precise calculation of position changes during the animation. The hook is there to prevent unnecessary re-renders.

<CollapsibleCode src={SwitchSrc} showLines={[23,25]}/>

The values are updated during the `onLayout` event of the element.

<CollapsibleCode src={SwitchSrc} showLines={[56,61]}/>

The **Switch** component can represent any boolean value passed as a prop. The state dynamically adjusts based on the `value` prop resulting in smooth transition animations. It enables passing any function using the `onPress` prop. The `duration` prop controls the duration of the animation. The `style` and `trackColors` props enable personalization.

<samp id="Switch">Switch</samp>

<CollapsibleCode src={SwitchSrc} showLines={[16,67]}/>
