import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export default function App() {
  const offset = useSharedValue(0);

  const pan = Gesture.Pan().onChange((event) => {
    offset.value += event.changeX;
  });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  // highlight-next-line
  const derivedOffset = useDerivedValue(() => offset.value * -1);

  const derivedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: derivedOffset.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <View onLayout={onLayout} style={styles.wrapper}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.box, animatedStyles]} />
          <Animated.View style={[styles.box, derivedStyles]} />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    height: 64,
    width: 64,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginVertical: 64,
  },
  label: {
    fontSize: 24,
  },
});
