import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColorMode } from '@docusaurus/theme-common';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const SIZE = 120;

export default function DecayBasicExample() {
  const colorModeStyles =
    useColorMode().colorMode === 'dark' ? darkStyles : lightStyles;
  const offset = useSharedValue(0);
  const width = useSharedValue(0);

  const onLayout = (event) => {
    width.value = event.nativeEvent.layout.width;
  };

  const pan = Gesture.Pan()
    .onChange((event) => {
      // highlight-next-line
      offset.value += event.changeX;
    })
    .onFinalize((event) => {
      // highlight-start
      offset.value = withDecay({
        velocity: event.velocityX,
        rubberBandEffect: true,
        clamp: [-(width.value / 2) + SIZE / 2, width.value / 2 - SIZE / 2],
      });
      // highlight-end
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <View onLayout={onLayout} style={styles.wrapper}>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.box, animatedStyles, colorModeStyles.box]}
          />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const lightStyles = StyleSheet.create({
  box: {
    backgroundColor: 'var(--swm-purple-light-100)',
  },
});

const darkStyles = StyleSheet.create({
  box: {
    backgroundColor: 'var(--swm-purple-dark-80)',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  wrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: SIZE,
    width: SIZE,
    cursor: 'grab',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
