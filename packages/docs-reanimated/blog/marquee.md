---
slug: marquee
title: Marquee
---

A marquee is an element used to display scrolling content horizontally within a confined space. It's commonly seen in applications to information such as news tickers, advertisements, or any content that needs continuous display within a limited area.

Looking for a ready-to-use solution? We recommend [@animatereactnative/marquee](https://www.npmjs.com/package/@animatereactnative/marquee).

import Marquee from '@site/static/examples/Marquee';
import MarqueeSrc from '!!raw-loader!@site/static/examples/Marquee';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

<InteractiveExample src={MarqueeSrc} component={Marquee} />

Now, let's understand how this example works:

The **MeasureElement** component measures the width of its children and passes this information to its parent component, Marquee.

<samp id="Marquee">Marquee</samp>

<CollapsibleCode src={MarqueeSrc} showLines={[8,18]}/>

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/marquee_android.mov",
    ios: "/react-native-reanimated/recordings/examples/marquee_ios.mov"
  }}
/>

We use the `useFrameCallback` hook to execute the animation logic on each frame.

<CollapsibleCode src={MarqueeSrc} showLines={[57,62]}/>

It is located inside **ChildrenScroller** component that manages the scrolling animation by updating the offset value. It determines the horizontal translation of the child components, creates clones of the children and animates them horizontally based on the specified duration.

<samp id="Marquee">Marquee</samp>
<CollapsibleCode src={MarqueeSrc} showLines={[43,76]}/>

The **Marquee** component serves as the main orchestrator of the marquee effect. It calculates necessary dimensions, renders child components within a container, and coordinates the animation by utilizing the ChildrenScroller component.

<samp id="Marquee">Marquee</samp>

<CollapsibleCode src={MarqueeSrc} showLines={[78,104]}/>
