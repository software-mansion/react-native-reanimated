---
id: accordion
title: Accordion
---

An accordion is a multifunctional element used to organize content effectively. With a simple click on its header or button, users can expand or collapse the content section below, providing a seamless way to manage information.

import Accordion from '@site/static/examples/Accordion';
import AccordionSrc from '!!raw-loader!@site/static/examples/Accordion';
import ExampleVideo from '@site/src/components/ExampleVideo';

<InteractiveExample src={AccordionSrc} component={<Accordion />} />

One notable aspect of this implementation is the use of [shared values](/docs/fundamentals/glossary#shared-value) with the `useSharedValue` hook. Leveraging shared values helps to prevent unnecessary re-renders.

```js
const height = useSharedValue(0);
```

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/accordion_android.mov",
    ios: "/react-native-reanimated/recordings/examples/accordion_ios.mov"
  }}
/>

The **AccordionItem** component encapsulates each item in the accordion. Item's height is managed by `useSharedValue` hook. The height dynamically adjusts based on the `isExpanded` prop, resulting in smooth expansion and collapse animations. The duration of these animations is controlled by the `duration` prop.

Inside the **AccordionItem**, the children represent the content section. It's flexible enough to accommodate various types of content.

<samp id="Accordion">Accordion</samp>

```js
function AccordionItem({
  isExpanded,
  children,
  viewKey,
  style,
  duration = 500,
}) {
  const height = useSharedValue(0);

  const derivedHeight = useDerivedValue(() =>
    withTiming(height.value * Number(isExpanded.value), {
      duration,
    })
  );
  const bodyStyle = useAnimatedStyle(() => ({
    height: derivedHeight.value,
  }));

  return (
    <Animated.View
      key={`accordionItem_${viewKey}`}
      style={[styles.animatedView, bodyStyle, style]}>
      <View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
        }}
        style={styles.wrapper}>
        {children}
      </View>
    </Animated.View>
  );
}
```
