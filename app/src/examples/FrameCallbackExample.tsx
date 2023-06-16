import Animated, {
  FrameInfo,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function FrameCallbackExample() {
  const limit = 200;

  const x1 = useSharedValue(0);
  const y1 = useSharedValue(0);

  const frameCallback1 = useFrameCallback((frameInfo: FrameInfo) => {
    if (frameInfo.timeSincePreviousFrame === null) {
      console.log('First frame!');
    } else {
      console.log('Frame info:', frameInfo);
    }

    if (x1.value === limit && y1.value !== 0) {
      y1.value -= 1;
    }
    if (x1.value === 0 && y1.value !== limit) {
      y1.value += 1;
    }
    if (y1.value === limit && x1.value !== limit) {
      x1.value += 1;
    }
    if (y1.value === 0 && x1.value !== 0) {
      x1.value -= 1;
    }
  }, false);

  const animatedStyle1 = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x1.value,
        },
        {
          translateY: y1.value,
        },
      ],
    };
  });

  const x2 = useSharedValue(0);
  const y2 = useSharedValue(0);

  const frameCallback2 = useFrameCallback(() => {
    if (x2.value === limit && y2.value !== 0) {
      y2.value -= 2;
    }
    if (x2.value === 0 && y2.value !== limit) {
      y2.value += 2;
    }
    if (y2.value === limit && x2.value !== limit) {
      x2.value += 2;
    }
    if (y2.value === 0 && x2.value !== 0) {
      x2.value -= 2;
    }
  }, false);

  const animatedStyle2 = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x2.value,
        },
        {
          translateY: y2.value,
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        <Animated.View style={[styles.box1, animatedStyle1]} />
        <Animated.View style={[styles.box2, animatedStyle2]} />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="Start/stop square1 animation 1"
          onPress={() => frameCallback1.setActive(!frameCallback1.isActive)}
        />
        <Button
          title="Start/stop square2 animation"
          onPress={() => frameCallback2.setActive(!frameCallback2.isActive)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    paddingBottom: 50,
  },
  box1: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: 'navy',
  },
  box2: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: 'red',
  },
});
