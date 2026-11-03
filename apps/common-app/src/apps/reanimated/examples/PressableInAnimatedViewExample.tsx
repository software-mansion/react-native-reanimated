import React, { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Repro for https://github.com/software-mansion/react-native-reanimated/issues/10121
//
// With `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` / `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`
// enabled, the transform is applied to the view without a ShadowTree commit.
// `Pressable` validates a press against the rectangle it measures from the
// ShadowTree, so without the commit on touch start a press with a slight
// finger movement fires `onPressIn` but not `onPress`.
export default function PressableInAnimatedViewExample() {
  const [pressInCount, setPressInCount] = useState(0);
  const [pressCount, setPressCount] = useState(0);

  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>
        onPressIn: {pressInCount} | onPress: {pressCount}
      </Text>
      <Button
        title="Animate (1s)"
        onPress={() => {
          translateY.value = withTiming(translateY.value === 0 ? 200 : 0, {
            duration: 1000,
          });
        }}
      />
      <Button
        title="Animate (2 min)"
        onPress={() => {
          translateY.value = withTiming(translateY.value === 0 ? 200 : 0, {
            duration: 120000,
          });
        }}
      />
      <Animated.View style={animatedStyle}>
        <Pressable
          style={styles.button}
          onPressIn={() => setPressInCount((c) => c + 1)}
          onPress={() => setPressCount((c) => c + 1)}>
          <Text style={styles.buttonText}>Press me</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 100,
  },
  counter: {
    fontSize: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: 'navy',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
  },
});
