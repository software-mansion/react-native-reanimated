import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { describe, expect, getTestComponent, render, test, useTestRef, wait } from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

type TestCase = {
  startColor: string;
  middleColor: string;
  finalColor: string;
};

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
          withDelay(DELAY, withTiming(colorActiveSV.value, { duration: 200 })),
          withDelay(DELAY, withTiming(middleColor, { duration: 300 })),
          withDelay(DELAY, withTiming(colorActiveSV.value, { duration: 200 })),
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
        withDelay(DELAY, withTiming(finalColor, { duration: 200 })),
        withDelay(DELAY, withTiming(middleColor, { duration: 300 })),
        withDelay(DELAY, withTiming(finalColor, { duration: 200 })),
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
    // TODO: Fix this test case
    // Expected hwb(70, 50%, 0%) received #00000000, mode: COLOR
    // {
    //   startColor: 'hwb(70, 50%, 0%)',
    //   middleColor: 'hsl(180, 50%, 50%)',
    //   finalColor: 'hsl(120,100%,50%)',
    // },
    // {
    //   startColor: 'hwb(70, 50%, 0%)',
    //   middleColor: 'hsl(180, 50%, 50%)',
    //   finalColor: 'hsl(120,100%,50%)',
    // },
    // {
    //   startColor: 'hwb(70, 50%, 0%)',
    //   middleColor: 'hsl(180, 50%, 50%)',
    //   finalColor: 'rgb(101,255,50)',
    // },
    // {
    //   startColor: 'hwb(70, 50%, 0%)',
    //   middleColor: 'hsl(180, 50%, 50%)',
    //   finalColor: 'hsla( 120 , 100% , 50%, 0.5 )',
    // },
    // {
    //   startColor: 'hwb(70, 50%, 0%)',
    //   middleColor: 'hsl(180, 50%, 50%)',
    //   finalColor: 'rgb(101,255,50)',
    // },
    // {
    //   startColor: 'hwb(70, 50%, 0%)',
    //   middleColor: 'hsl(180, 50%, 50%)',
    //   finalColor: 'rgba(100,255,50,0.5)',
    // },
  ])(
    'Animate ${startColor} → ${finalColor} → ${middleColor} → ${finalColor}',
    async ({ startColor, middleColor, finalColor }) => {
      await render(<WidthComponent startColor={startColor} middleColor={middleColor} finalColor={finalColor} />);
      const activeComponent = getTestComponent(Component.ACTIVE);
      const passiveComponent = getTestComponent(Component.PASSIVE);

      await wait(DELAY / 2);
      // TODO Decide what should be the starting value of activeComponent
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).not.toBe(startColor, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(startColor, ComparisonMode.COLOR);
      await wait(200 + DELAY);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(finalColor, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(finalColor, ComparisonMode.COLOR);
      await wait(300 + DELAY);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(middleColor, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(middleColor, ComparisonMode.COLOR);
      await wait(200 + DELAY);
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
