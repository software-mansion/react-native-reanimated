---
id: useAnimatedKeyboard
title: useAnimatedKeyboard
sidebar_label: useAnimatedKeyboard
---
With the `useAnimatedKeyboard` hook, you can create animations based on current kayboard position.

On Android, make sure to set `android:windowSoftInputMode` in your `AndroidMainfest.xml` to `adjustResize`. Then, using the `useAnimatedKeyboard` hook disables
the default Android behavior (resizing the view to accomodate keyboard) in the whole app. Using values from `useAnimatedKeyboard` hook you can handle the keyboard yourself. Unmounting all components that use `useAnimatedKeyboard` hook brings back the default Android behavior.

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
function AnimatedKeyboardExample() {
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
