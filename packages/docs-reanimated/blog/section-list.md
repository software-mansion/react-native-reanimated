---
slug: sectionlist
title: Section List
---

import SectionList from '@site/static/examples/SectionList';
import SectionListSrc from '!!raw-loader!@site/static/examples/SectionList';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

Section lists allow you to organize long lists of content by dividing them with headings.

<InteractiveExample src={SectionListSrc} component={SectionList} />

The primary component, **SectionList**, acts as the main orchestrator of the entire Section List interface. It coordinates the rendering of the table of contents and individual content sections.

<samp id="SectionList">Section List</samp>

<CollapsibleCode src={SectionListSrc} showLines={[150,174]}/>

Within **SectionList**, there are two key components: **TableOfContents** and **SectionCards**.

**TableOfContents** is responsible for rendering the list of section names as a table of contents. It receives props such as `data`, `visibleIndex`, `sectionCardsRef`, and `tableOfContentsRef` to manage navigation and synchronization between the table of contents and section content.

<samp id="SectionList">Section List</samp>

<CollapsibleCode src={SectionListSrc} showLines={[123,148]}/>

**SectionCards**, on the other hand, manages the rendering of individual sections and their corresponding content. It receives props: `sections`, `visibleIndex`, `sectionCardsRef`, and `tableOfContentsRef` to render the content sections and handle scrolling interactions.

<samp id="SectionList">Section List</samp>

<CollapsibleCode src={SectionListSrc} showLines={[198,256]}/>

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/section_list_android.mov",
    ios: "/react-native-reanimated/recordings/examples/section_list_ios.mov"
  }}
/>

The `onScroll` in **SectionCards** calculates the offset as the user scrolls through the content and determines which section is currently most visible on the screen. It is done by comparing the distance of each section from the top of the screen - it identifies the section closest to the viewport's top edge.

<CollapsibleCode src={SectionListSrc} showLines={[204,227]}/>

We use the `useSharedValue` hook to create mutable shared values across different components. For instance, `selectedItem` and `visibleIndex` are [shared values](/docs/fundamentals/glossary#shared-value) used to manage the currently selected section and its visibility index.

<CollapsibleCode src={SectionListSrc} showLines={[151,152]}/>

Additionally, we use `useAnimatedStyle` hook to define [animated styles](/docs/core/useAnimatedStyle/) based on the shared values. Then, we apply these animated styles to components to create dynamic visual effects, such as changing font weights and adding bottom borders.

<CollapsibleCode src={SectionListSrc} showLines={[96,99]}/>

To enable interaction with the FlashList component - such as scrolling to specific sections, the code utilizes variables created using `useRef` such as `sectionCardsRef` and `tableContentsRef`

<CollapsibleCode src={SectionListSrc} showLines={[154,155]}/>

Here, the `debounce` function throttles the invocations of `onScroll` event handler which improves the performance.

<CollapsibleCode src={SectionListSrc} showLines={[85,93]}/>
