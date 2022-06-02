---
id: useAnimatedKeyboard
title: useAnimatedKeyboard
sidebar_label: useAnimatedKeyboard
---
With the `useAnimatedKeyboard` hook, you can create animations based on current kayboard position.

```js
useAnimatedKeyboard() -> [AnimatedKeyboardInfo]
```

### Returns
Hook `useAnimatedKeyboard` returns an instance of [[AnimatedKeyboardInfo](#animatedkeyboard-object)];

### Types

#### `AnimatedKeyboardInfo: [object]`
Properties:
* `isShown`: [[SharedValue](../../api/hooks/useSharedValue)] contains [boolean]
  contains info whether keyboard is shown on the screen
* `isAnimating`: [[SharedValue](../../api/hooks/useSharedValue)] contains [boolean]
  contains info whether keyboard is currently animating
* `height`: [[SharedValue](../../api/hooks/useSharedValue)] contains [number]
  contains current height of the keyboard

### Example
```js
function AnimatedStyleUpdateExample(): React.ReactElement {
  const keyboard = useAnimatedKeyboard();
  const translateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboard.height.value }],
    };
  });

  return (
    <ScrollView contentContainerStyle={{flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={translateStyle}>
        <TextInput />
      </Animated.View>
    </ScrollView>
  );
}
```

### Tips

:::caution

On Android, make sure to set `android:windowSoftInputMode` in your `AndroidMainfest.xml` to `adjustResize`.

:::