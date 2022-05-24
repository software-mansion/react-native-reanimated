---
id: useAnimatedKeyboard
title: useAnimatedKeyboard
sidebar_label: useAnimatedKeyboard
---
With the `useAnimatedKeyboard` hook, you can create animations based on current kayboard position.
On iOS and Android 11 and later you can get info about keyboard animation. On lower versions of Android you can only check whether the keyboard is up or not and its height when it's fully up.

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
    if (Platform.OS === 'ios' || Platform.Version >= 30) {
      return {
        transform: [{ translateY: -keyboard.height.value }],
      };
    }
    return {};
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

On Android, set `android:windowSoftInputMode` in your `AndroidMainfest.xml` according to your use case. On Androids < 11 set it to `adjustResize` or `adjustPan` to get info about keyboard and layout the app correctly. On Androids >= 11 you can also use `adjustNothing` and layout the app yourself based on `useAnimatedKeyboard` data.
You can set `android:windowSoftInputMode` programatically by using for example [this](https://github.com/zubricky/react-native-android-keyboard-adjust) package.

:::