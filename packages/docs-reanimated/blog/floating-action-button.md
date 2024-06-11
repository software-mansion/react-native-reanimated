---
slug: floatingactionbutton
title: Floating Action Button
---

Floating Action Button provides user with easy-accessible panel with primary or most common actions on the screen.

import FABButton from '@site/static/examples/FABButton';
import FABButtonSrc from '!!raw-loader!@site/static/examples/FABButton';
import ExampleVideo from '@site/src/components/ExampleVideo';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

<InteractiveExample src={FABButtonSrc} component={FABButton} />

We use [shared values](/docs/fundamentals/glossary#shared-value) to monitor if the button is expanded. The `useSharedValue` hook helps prevent unnecessary re-renders during state changes.

<CollapsibleCode src={FABButtonSrc} showLines={[28,32]}/>

The state is toggled when the main _Actions_ button is pressed, which triggers animations for other secondary buttons.

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/fab_android.mov",
    ios: "/react-native-reanimated/recordings/examples/fab_ios.mov"
  }}
/>

It also relies on [animatable values](/docs/fundamentals/glossary#animatable-value). Leveraging animatable values of rotation and position enables smooth transition between the two states.

<samp id="FABButton">Floating Action Button</samp>

<CollapsibleCode src={FABButtonSrc} showLines={[62,73]}/>

The **FABButton** is a reusable component that manages button styles, content and animations. For this we use props: `buttonLetter` and `animatedStyles`.

<CollapsibleCode src={FABButtonSrc} showLines={[21,25]}/>

We dynamically generate animated styles for the buttons. The delay in their appearance on the screen is calculated based on the button's index. Buttons with a higher index will appear later and be positioned higher in the "column" of buttons.

<samp id="FABButton">Floating Action Button</samp>

<CollapsibleCode src={FABButtonSrc} showLines={[34,59]}/>
