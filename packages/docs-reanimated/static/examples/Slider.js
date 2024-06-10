import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';

const INITIAL_BOX_SIZE = 50;
const SLIDER_WIDTH = 300;

const Slider = () => {
  const offset = useSharedValue(0);
  const [boxWidth, setBoxWidth] = useState(INITIAL_BOX_SIZE);
  const MAX_VALUE = SLIDER_WIDTH - INITIAL_BOX_SIZE;

  const updateBoxWidth = (width) => {
    'worklet';
    //highlight-next-line
    runOnJS(setBoxWidth)(width);
  };

  const pan = Gesture.Pan().onChange((event) => {
    offset.value =
      Math.abs(offset.value) <= MAX_VALUE
        ? offset.value + event.changeX <= 0
          ? 0
          : offset.value + event.changeX >= MAX_VALUE
          ? MAX_VALUE
          : offset.value + event.changeX
        : offset.value;

    const newWidth = INITIAL_BOX_SIZE + offset.value;
    updateBoxWidth(newWidth);
  });

  const boxStyle = useAnimatedStyle(() => {
    return {
      width: INITIAL_BOX_SIZE + offset.value,
    };
  });

  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.boxWidthText}>
        Box width: {Math.round(boxWidth)}px
      </Text>
      <Animated.View style={[styles.box, boxStyle]} />
      <View style={styles.sliderTrack}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.sliderHandle, sliderStyle]} />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 50,
    backgroundColor: '#82cab2',
    borderRadius: 25,
    justifyContent: 'center',
    padding: 5,
  },
  sliderHandle: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9ff',
    borderRadius: 20,
    position: 'absolute',
    left: 5,
  },
  box: {
    height: INITIAL_BOX_SIZE,
    backgroundColor: '#b58df1',
    borderRadius: 10,
  },
  boxWidthText: {
    fontSize: 18,
    color: '#001a72',
  },
});

export default Slider;
