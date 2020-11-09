---
id: useAnimatedStyle
title: useAnimatedStyle
sidebar_label: useAnimatedStyle
---

This hook is one of the main elements of the new Reanimated v2 API.
It allows for creating an association between shared values and View properties.
The hook takes a single worklet (it is not necessary to add `worklet` directive here, because the method will be converted to worklet automatically).
The provided worklet is responsible for returning a object with view style properties.

For the list of available properties you can refer to the React Native core documentation on [View Style Props](https://reactnative.dev/docs/view-style-props). You may also want to check React Native’s [guide on styling views](https://reactnative.dev/docs/style).

In order to connect the animated style hook result, you need to pass it as one of the `style` properties to the `Animated` version of the component (e.g. `Animated.View`).
In React Native, View’s `style` property can take an array of styles, which gives you a way to mix static and dynamic styles.
We recommend that you defined static styles using React Native’s [`StyleSheet` API](https://reactnative.dev/docs/stylesheet) and pass them along the animated styles object returned by this hook.
It is more efficient to only keep styles that are actually changed as a result of animation in the animated style hook, and the rest of the styles should be either provided as inline objects or using StyleSheets.

If the style worklet uses any shared values, it will be executed upon these values updates and the connected view will be updated.

## Example

```js {11-15}
import { StyleSheet } from 'react-native';
import {
  Animated,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

function App() {
  const width = useSharedValue(50);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
    };
  });

  // attach animated style to a View using style property
  return <Animated.View style={[styles.box, animatedStyle]} />;
}

const styles = StyleSheet.create({
  box: {
    height: 50,
    backgroundColor: 'blue',
  },
});
```

In the above example, the used shared value is not changing, hence there is no real benefit of using an animated style there.
Check out the documentation of [`useSharedValue`](useSharedValue) to learn how shared values can be updated.
