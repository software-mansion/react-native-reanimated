import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, Dimensions, StyleSheet, View } from 'react-native';

import React from 'react';

export default function FrameCallbackExample() {
  const x1 = useSharedValue(0);
  const y1 = useSharedValue(0);

  let windowX = Math.min(
    Dimensions.get('window').width,
    Dimensions.get('window').height
  );
  windowX -= styles.box1.height;
  windowX -= windowX % 2;

  const frameCallback1 = useFrameCallback(() => {
    if (x1.value === windowX && y1.value !== 0) {
      y1.value -= 1;
    }
    if (x1.value === 0 && y1.value !== windowX) {
      y1.value += 1;
    }
    if (y1.value === windowX && x1.value !== windowX) {
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
    if (x2.value === windowX && y2.value !== 0) {
      y2.value -= 2;
    }
    if (x2.value === 0 && y2.value !== windowX) {
      y2.value += 2;
    }
    if (y2.value === windowX && x2.value !== windowX) {
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
          title={'Start/stop square1 animation'}
          onPress={() => {
            if (frameCallback1.state) {
              frameCallback1.stop();
            } else {
              frameCallback1.start();
            }
          }}
        />
        <Button
          title={'Start/stop square2 animation'}
          onPress={() => {
            if (frameCallback2.state) {
              frameCallback2.stop();
            } else {
              frameCallback2.start();
            }
          }}
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
