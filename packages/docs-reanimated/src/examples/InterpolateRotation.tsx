import 'react-native-gesture-handler';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

export default function App() {
  const offset = useSharedValue<number>(0);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.wrapper}>
        <Box offset={offset} extrapolation={Extrapolation.EXTEND} />
        <Box offset={offset} extrapolation={Extrapolation.CLAMP} />
        <Box offset={offset} extrapolation={Extrapolation.IDENTITY} />
      </View>
    </GestureHandlerRootView>
  );
}

interface BoxProps {
  offset: SharedValue<number>;
  extrapolation: Extrapolation;
}

function Box({ offset, extrapolation }: BoxProps) {
  const pan = Gesture.Pan()
    .onChange((event) => {
      offset.value = event.translationX;
    })
    .onFinalize(() => {
      offset.value = withTiming(0);
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.value },
      {
        // highlight-start
        rotate:
          interpolate(
            offset.value,
            [-100, 0, 100],
            [-360, 0, 360],
            extrapolation
          ) + 'deg',
        // highlight-end
      },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.box, animatedStyles]}>
        <Text style={styles.text}>{extrapolation.toUpperCase()}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: 200,
    borderLeftColor: '#b58df1',
    borderLeftWidth: 1,
    borderRightColor: '#b58df1',
    borderRightWidth: 1,
    borderStyle: 'dashed',
  },
  box: {
    height: 80,
    width: 80,
    margin: 20,
    borderWidth: 1,
    borderColor: '#b58df1',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
  },
  text: {
    color: '#b58df1',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
});
