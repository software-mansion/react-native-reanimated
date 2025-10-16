---
slug: flipCard
title: Flip Card
---

Flip card allows you to display different content depending on whether the card is flipped or not. It can be especially useful when you do not want to display some data immediately after entering the screen (e.g. secure data) and only after fulfilling a certain condition or performing an action.

import FlipCard from '@site/static/examples/FlipCard';
import FlipCardSrc from '!!raw-loader!@site/static/examples/FlipCard';

<InteractiveExample src={FlipCardSrc} component={FlipCard} />

For storing information about whether the card is flipped or not we use [shared value](/docs/fundamentals/glossary#shared-value) with the `useSharedValue` hook. Using shared values helps to prevent unnecessary re-renders.

<CollapsibleCode src={FlipCardSrc} showLines={[116,116]} />

This allows us to [interpolate](/docs/utilities/interpolate) values between 0-180 and 180-360 degrees, depending on whether the card is flipped or not. In addition, we use [withTiming](/docs/animations/withTiming) util which makes our animation smooth.

<CollapsibleCode src={FlipCardSrc} showLines={[61,63]} />

<ExampleVideo
sources={{
        android: "/react-native-reanimated/recordings/examples/flip_card_android.mov",
        ios: "/react-native-reanimated/recordings/examples/flip_card_ios.mov"
    }}
/>

The **FlipCard** component accepts several props: `duration` allows you to change the duration of the animation, setting `direction` to the value `x` allows you to change the direction of our animation, **RegularContent** and **FlippedContent** give ability to display different content for flipped and non flipped variants.

<samp id="FlipCard">Flip Card</samp>

<CollapsibleCode src={FlipCardSrc} showLines={[50,102]} />
