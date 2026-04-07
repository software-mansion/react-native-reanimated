---
slug: accordion
title: Accordion
---

An accordion allows to show and hide a piece of content with a smooth animation. Commonly used in "FAQ" sections.

import Accordion from '@site/static/examples/Accordion';
import AccordionSrc from '!!raw-loader!@site/static/examples/Accordion';

<InteractiveExample src={AccordionSrc} component={Accordion} />

The following implementation of an accordion relies on [shared values](/docs/fundamentals/glossary#shared-value). Leveraging shared values helps to prevent unnecessary re-renders. We define shared values using the useSharedValue hook.

<CollapsibleCode src={AccordionSrc} showLines={[16,16]}/>

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/accordion_android.mov",
    ios: "/react-native-reanimated/recordings/examples/accordion_ios.mov"
  }}
/>

The **AccordionItem** component encapsulates each item in the accordion. A `height` shared value manages the height of the item. The height dynamically adjusts based on the `isExpanded` prop, resulting in smooth expansion and collapse animations. The `duration` prop controls the duration of the animation.

Inside the **AccordionItem**, the children represent the content section. It can accommodate various types of content.

<samp id="Accordion">Accordion</samp>

<CollapsibleCode src={AccordionSrc} showLines={[9,41]}/>
