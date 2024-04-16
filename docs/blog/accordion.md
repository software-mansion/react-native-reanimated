---
slug: accordion
title: Accordion
---

An accordion is a multifunctional element used to organize content effectively. With a simple click on its header or button, users can expand or collapse the content section below, providing a seamless way to manage information.

import Accordion from '@site/static/examples/Accordion';
import AccordionSrc from '!!raw-loader!@site/static/examples/Accordion';
import ExampleVideo from '@site/src/components/ExampleVideo';

<InteractiveExample src={AccordionSrc} component={<Accordion />} />

One notable aspect of this implementation is the use of [shared values](/docs/fundamentals/glossary#shared-value) with the `useSharedValue` hook. Leveraging shared values helps to prevent unnecessary re-renders.

<CollapsibleCode src={AccordionSrc} showLines={[16,16]}/>

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/accordion_android.mov",
    ios: "/react-native-reanimated/recordings/examples/accordion_ios.mov"
  }}
/>

The **AccordionItem** component encapsulates each item in the accordion. Item's height is managed by `useSharedValue` hook. The height dynamically adjusts based on the `isExpanded` prop, resulting in smooth expansion and collapse animations. The duration of these animations is controlled by the `duration` prop.

Inside the **AccordionItem**, the children represent the content section. It's flexible enough to accommodate various types of content.

<samp id="Accordion">Accordion</samp>

<CollapsibleCode src={AccordionSrc} showLines={[9,41]}/>
