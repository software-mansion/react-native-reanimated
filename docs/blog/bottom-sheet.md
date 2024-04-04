---
id: bottomsheet
title: Bottom Sheet
---

Bottom sheets are surfaces containing supplementary content, anchored to the bottom of the screen. The purpose of them in mobile application is to provide users with quick access to contextual information, actions, or settings without interrupting their current workflow.

import BottomSheet from '@site/static/examples/BottomSheet';
import BottomSheetSrc from '!!raw-loader!@site/static/examples/BottomSheet';

<InteractiveExample src={BottomSheetSrc} component={<BottomSheet />} />

Now, let's delve into the provided code:

The **BottomSheet** component accepts props such as `isOpen` - a [shared value](/docs/fundamentals/glossary#shared-value) indicating whether the bottom sheet is open or closed, `toggleSheet` - a function to toggle the visibility of the bottom sheet, and an optional `duration` for animation.

<samp id="BottomSheet">Bottom Sheet</samp>

```js
function BottomSheet({ isOpen, toggleSheet, duration = 500, children }) {
  /*
  /* content
  */
  return (
    <>
      <Animated.View style={backdropStyle}>
        <TouchableOpacity style={styles.flex} onPress={toggleSheet} />
      </Animated.View>
      <Animated.View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
        }}
        style={sheetStyle}>
        {children}
      </Animated.View>
    </>
  );
}
```

The `height` shared value is used to track the height of the bottom sheet, while the `progress` derived value interpolates between 0 and 1 based on the state of `isOpen`, controlling the animation of the bottom sheet.

```js
const height = useSharedValue(0);
const progress = useDerivedValue(() =>
  withTiming(isOpen.value ? 0 : 1, { duration })
);
```

The `useAnimatedStyle` hook helps in creating [animated styles](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/) based on shared values. These styles are then applied to **BottomSheet** to make it visually dynamic by adding backdrop and translating bottom sheet to the top.

```js
const sheetStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: progress.value * 2 * height.value }],
}));

const backdropStyle = useAnimatedStyle(() => ({
  opacity: 1 - progress.value,
  zIndex: isOpen.value
    ? 1
    : withDelay(duration, withTiming(-1, { duration: 0 })),
}));
```
