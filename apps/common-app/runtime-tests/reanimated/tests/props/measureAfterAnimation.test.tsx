import type { ComponentRef } from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  notify,
  render,
  test,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const NOTIFICATION_NAME = 'MEASURE_AFTER_ANIMATION_FINISHED';
const TRANSLATION = 200;
// The test reads the start position before the animation starts.
const ANIMATION_DELAY_MS = 500;

let measuredView: ComponentRef<typeof View> | null = null;

function measurePageY() {
  return new Promise<number>((resolve) => {
    measuredView?.measure((_x, _y, _width, _height, _pageX, pageY) =>
      resolve(pageY)
    );
  });
}

function TranslatedBox() {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    measuredView = ref.current;
    translateY.value = withDelay(
      ANIMATION_DELAY_MS,
      withTiming(TRANSLATION, { duration: 200 }, () => {
        notify(NOTIFICATION_NAME);
      })
    );
  }, [translateY]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.box, animatedStyle]} />
    </View>
  );
}

describe('measure after an animation', () => {
  test('measure returns the final transform a few frames after the animation ends', async () => {
    await render(<TranslatedBox />);
    await waitForFrames(1);
    const startPageY = await measurePageY();

    await waitForNotification(NOTIFICATION_NAME);
    await waitForFrames(3);
    const endPageY = await measurePageY();

    expect(endPageY - startPageY).toBe(
      TRANSLATION,
      ComparisonMode.FLOAT_DISTANCE
    );
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    height: 100,
    width: 100,
  },
});
