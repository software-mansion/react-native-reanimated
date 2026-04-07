---
slug: floatingactionbutton
title: Floating Action Button
---

Floating Action Button provides user with easy-accessible panel with primary or most common actions on the screen.

import FloatingActionButton from '@site/static/examples/FloatingActionButton';
import FloatingActionButtonSrc from '!!raw-loader!@site/static/examples/FloatingActionButton';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

<InteractiveExample src={FloatingActionButtonSrc} component={FloatingActionButton} />

We use [shared values](/docs/fundamentals/glossary#shared-value) to monitor if the button is expanded. The `useSharedValue` hook helps prevent unnecessary re-renders during state changes.

<CollapsibleCode src={FloatingActionButtonSrc} showLines={[49,52]}/>

The state is toggled when the main _Actions_ button is pressed, which triggers animations for other secondary buttons.

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/fab_android.mov",
    ios: "/react-native-reanimated/recordings/examples/fab_ios.mov"
  }}
/>

It also relies on [animatable values](/docs/fundamentals/glossary#animatable-value). Leveraging animatable values of rotation and position enables smooth transition between the two states.

<samp id="FloatingActionButton">Floating Action Button</samp>

<CollapsibleCode src={FloatingActionButtonSrc} showLines={[55,67]}/>

The **FloatingActionButton** is a reusable component that manages button styles, content and animations. For this we use props: `buttonLetter`, `index` and `isExpanded`.

<CollapsibleCode src={FloatingActionButtonSrc} showLines={[21,46]}/>

We define the animated styles for the buttons within the FloatingActionButton component, passing the necessary values as props. The delay in their appearance on the screen is calculated based on the button's index. Buttons with a higher index will appear later and be positioned higher in the "column" of buttons.

<samp id="FloatingActionButton">Floating Action Button</samp>

<CollapsibleCode src={FloatingActionButtonSrc} showLines={[22,46]}/>
