---
id: useAnimatedStyle
title: useAnimatedStyle
sidebar_label: useAnimatedStyle
---

This hook is one of the main elements of the new Reanimated v2 API.
It allows for creating an association between shared values and View properties.

### Arguments

#### `updater` [Function]

Single worklet which is responsible for returning an object with view style properties.

#### `dependencies` [Array]

Optional array of values which changes cause this hook to receive updated values during rerender of the wrapping component. This matters when, for instance, worklet uses values dependent on the component's state.

Example:

```js {9}
const App = () => {
  const [state, setState] = useState(0);
  const sv = useSharedValue(state);

  const style = useAnimatedStyle(() => {
    return {
      width: sv.value,
    };
  }, dependencies);
  //...
  return <></>;
};
```

`dependencies` here may be:

- `undefined`(argument skipped) - worklet will be rebuilt if there is any change in it's body or any values from it's closure(variables from outer scope used in worklet),
- empty array(`[]`) - worklet will be rebuilt only if it's body changes,
- array of values(`[val1, val2, ..., valN]`) - worklet will be rebuilt if there is any change in it's body or any values from the given array.

### Returns

Animated style - in order to connect the animated style hook result, you need to pass it as one of the `style` properties to the `Animated` version of the component (e.g. `Animated.View`).
In React Native, View's `style` property can take an array of styles, which gives you a way to mix static and dynamic styles.
We recommend that you defined static styles using React Native's [`StyleSheet` API](https://reactnative.dev/docs/stylesheet) and pass them along the animated styles object returned by this hook.
It is more efficient to only keep styles that are actually changed as a result of animation in the animated style hook, and the rest of the styles should be either provided as inline objects or using StyleSheets.

If the style worklet uses any shared values, it will be executed upon these values updates and the connected view will be updated.

For the list of available properties you can refer to the React Native core documentation on [View Style Props](https://reactnative.dev/docs/view-style-props). You may also want to check React Native's [guide on styling views](https://reactnative.dev/docs/style).

:::caution

Animated styles cannot be shared between views.

To work around this you can generate multiple useAnimatedStyle in top-level loop (number of iterations must be static, see React's [Rules of Hooks](https://reactjs.org/docs/hooks-rules.html#only-call-hooks-at-the-top-level) for more information).

:::

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
