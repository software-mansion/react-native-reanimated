import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  wait,
  waitForNotify,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

type TestCase = {
  startColor: string;
  middleColor: string;
  finalColor: string;
};

const START_ANIMATION_NOTIFICATION_NAME = 'START_ANIMATION_NOTIFICATION';
const MIDDLE_ANIMATION_NOTIFICATION_NAME = 'MIDDLE_ANIMATION_NOTIFICATION';
const FINAL_ANIMATION_NOTIFICATION_NAME = 'FINAL_ANIMATION_NOTIFICATION';

describe('withSequence animation of color', () => {
  enum Component {
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
  }
  const DELAY = 75;
  const WidthComponent = ({ startColor, middleColor, finalColor }: TestCase) => {
    const colorActiveSV = useSharedValue(startColor);
    const colorPassiveSV = useSharedValue(startColor);

    const refActive = useTestRef(Component.ACTIVE);
    const refPassive = useTestRef(Component.PASSIVE);

    const styleActive = useAnimatedStyle(() => {
      return {
        backgroundColor: withSequence(
          withDelay(
            DELAY,
            withTiming(colorActiveSV.value, { duration: 200 }, () => notify(START_ANIMATION_NOTIFICATION_NAME)),
          ),
          withDelay(
            DELAY,
            withTiming(middleColor, { duration: 300 }, () => notify(MIDDLE_ANIMATION_NOTIFICATION_NAME)),
          ),
          withDelay(
            DELAY,
            withTiming(colorActiveSV.value, { duration: 200 }, () => notify(FINAL_ANIMATION_NOTIFICATION_NAME)),
          ),
        ),
      };
    });
    const stylePassive = useAnimatedStyle(() => {
      return {
        backgroundColor: colorPassiveSV.value,
      };
    });

    useEffect(() => {
      colorActiveSV.value = finalColor;
    }, [colorActiveSV, finalColor]);

    useEffect(() => {
      colorPassiveSV.value = withSequence(
        withDelay(
          DELAY,
          withTiming(finalColor, { duration: 200 }, () => notify(START_ANIMATION_NOTIFICATION_NAME)),
        ),
        withDelay(
          DELAY,
          withTiming(middleColor, { duration: 300 }, () => notify(MIDDLE_ANIMATION_NOTIFICATION_NAME)),
        ),
        withDelay(
          DELAY,
          withTiming(finalColor, { duration: 200 }, () => notify(FINAL_ANIMATION_NOTIFICATION_NAME)),
        ),
      );
    }, [colorPassiveSV, finalColor, middleColor]);

    return (
      <View style={styles.container}>
        <Animated.View ref={refActive} style={[styles.animatedBox, styleActive]} />
        <Animated.View ref={refPassive} style={[styles.animatedBox, stylePassive]} />
      </View>
    );
  };

  test.each([
    {
      startColor: 'gold',
      middleColor: 'forestgreen',
      finalColor: 'darkblue',
    },
    {
      startColor: '#ffd700ab',
      middleColor: 'forestgreen',
      finalColor: 'darkblue',
    },
    {
      startColor: '#ffd700ab',
      middleColor: 'forestgreen',
      finalColor: '#88bbcc44',
    },
    {
      startColor: 'gold',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'gold',
      middleColor: 'hsl(70, 100%, 75%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsl(120,100%,50%)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'rgb(101,255,50)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'hsla( 120 , 100% , 50%, 0.5 )',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hsl(180, 50%, 50%)',
      finalColor: 'rgb(101,255,50)',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      middleColor: 'hwb(180, 50%, 50%)',
      finalColor: 'hwb(100, 50%, 0%)',
    },
  ])(
    'Animate ${startColor} → ${finalColor} → ${middleColor} → ${finalColor}',
    async ({ startColor, middleColor, finalColor }) => {
      await render(<WidthComponent startColor={startColor} middleColor={middleColor} finalColor={finalColor} />);
      const activeComponent = getTestComponent(Component.ACTIVE);
      const passiveComponent = getTestComponent(Component.PASSIVE);

      await wait(DELAY / 2);
      // TODO: There is inconsistency in parsing props, we don't parse colors properly during first frame (render).
      // It will be fixed in the future.
      if (!startColor.startsWith('hwb')) {
        expect(await activeComponent.getAnimatedStyle('backgroundColor')).not.toBe(startColor, ComparisonMode.COLOR);
        expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(startColor, ComparisonMode.COLOR);
      }
      await waitForNotify(START_ANIMATION_NOTIFICATION_NAME);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(finalColor, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(finalColor, ComparisonMode.COLOR);
      await waitForNotify(MIDDLE_ANIMATION_NOTIFICATION_NAME);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(middleColor, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(middleColor, ComparisonMode.COLOR);
      await waitForNotify(FINAL_ANIMATION_NOTIFICATION_NAME);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(finalColor, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(finalColor, ComparisonMode.COLOR);
    },
  );
});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    margin: 30,
  },
});
