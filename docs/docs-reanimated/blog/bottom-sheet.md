---
slug: bottomsheet
title: Bottom Sheet
---

Bottom sheets are surfaces containing supplementary content, anchored to the bottom of the screen. They can provide users with quick access to contextual information, actions, or settings without interrupting their current workflow.

Looking for a ready-to-use solution? We recommend [@gorhom/bottom-sheet](https://www.npmjs.com/package/@gorhom/bottom-sheet).

import BottomSheet from '@site/static/examples/BottomSheet';
import BottomSheetSrc from '!!raw-loader!@site/static/examples/BottomSheet';
import CollapsibleCode from '@site/src/components/CollapsibleCode';

<InteractiveExample src={BottomSheetSrc} component={BottomSheet} />

The **BottomSheet** component accepts props such as `isOpen` - a [shared value](/docs/fundamentals/glossary#shared-value) indicating whether the bottom sheet is open or closed, `toggleSheet` - a function to toggle the visibility of the bottom sheet, and an optional `duration` for animation.

<samp id="BottomSheet">Bottom Sheet</samp>

<CollapsibleCode src={BottomSheetSrc} showLines={[17,48]}/>

The `height` shared value is used to track the height of the bottom sheet, while the `progress` derived value interpolates between 0 and 1 based on the state of `isOpen`, controlling the animation of the bottom sheet.

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/bottom_sheet_android.mov",
    ios: "/react-native-reanimated/recordings/examples/bottom_sheet_ios.mov"
  }}
/>

<CollapsibleCode src={BottomSheetSrc} showLines={[18,21]}/>

The `useAnimatedStyle` hook helps in creating [animated styles](/docs/core/useAnimatedStyle/) based on shared values. These styles are then applied to **BottomSheet** to make it visually dynamic by adding backdrop and translating bottom sheet to the top.

<CollapsibleCode src={BottomSheetSrc} showLines={[23,32]}/>
