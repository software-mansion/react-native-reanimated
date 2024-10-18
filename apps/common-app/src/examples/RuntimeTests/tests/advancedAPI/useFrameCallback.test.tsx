import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useFrameCallback } from 'react-native-reanimated';
import { describe, test, expect, render, getTestComponent, wait, useTestRef } from '../../ReJest/RuntimeTestsApi';

describe('Test *****useFrameCallback*****', () => {
  describe('Test _canceling frameCallback_ after predefined time', () => {
    const STOP_AFTER_DELAY_REF = 'CancelAfterDelayComponent';
    const CancelAfterDelayComponent = ({ timeToStop }: { timeToStop: number }) => {
      const width = useSharedValue(0);
      const ref = useTestRef(STOP_AFTER_DELAY_REF);

      const frameCallback = useFrameCallback(({ timeSincePreviousFrame }) => {
        if (timeSincePreviousFrame) {
          width.value += timeSincePreviousFrame / 8;
        }
      });

      const animatedStyle = useAnimatedStyle(() => {
        return { width: width.value };
      });

      useEffect(() => {
        setTimeout(() => {
          frameCallback.setActive(false);
        }, timeToStop);
      }, [timeToStop, frameCallback]);

      return (
        <View style={styles.container}>
          <Animated.View ref={ref} style={[styles.animatedBox, animatedStyle]} />
        </View>
      );
    };
    test.each([500, 1000])('Run frameCallback for **%p**ms', async timeToStop => {
      await render(<CancelAfterDelayComponent timeToStop={timeToStop} />);
      const animatedComponent = getTestComponent(STOP_AFTER_DELAY_REF);

      await wait(timeToStop + 200);

      const expectedWidth = timeToStop / 8;
      expect(await animatedComponent.getAnimatedStyle('width')).toBeWithinRange(expectedWidth - 1, expectedWidth + 2);
    });
  });

  describe('Test _canceling frameCallback_ after predefined time', () => {
    const InvalidFrameCallback = () => {
      const imNotAWorklet = () => {
        console.log('I am not a worklet');
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const frameCallback = useFrameCallback(_frameInfo => {
        imNotAWorklet();
      });

      return <View />;
    };

    test('frameCallback should be workletized', async () => {
      await expect(async () => {
        await render(<InvalidFrameCallback />);
        await wait(200);
      }).toThrow(
        'ReanimatedError: [Reanimated] Tried to synchronously call a non-worklet function `imNotAWorklet` on the UI thread.\nSee https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details., js engine: reanimated',
      );
    });
  });
});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    backgroundColor: 'seagreen',
    height: 80,
    margin: 30,
  },
});
