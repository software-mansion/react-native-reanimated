// TODO: Enable this test after RuntimeTests are implemented on Fabric

import { useEffect } from 'react';
import type { BoxShadowValue } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatableValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '@/apps/reanimated/examples/RuntimeTests/ReJest/RuntimeTestsApi';
import { ComparisonMode } from '@/apps/reanimated/examples/RuntimeTests/ReJest/types';

describe('animation of BoxShadow', () => {
  enum Component {
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
  }
  function BoxShadowComponent({
    finalBoxShadow,
    startBoxShadow,
  }: {
    finalBoxShadow: BoxShadowValue;
    startBoxShadow: BoxShadowValue;
  }) {
    const boxShadowActiveSV = useSharedValue(startBoxShadow);
    const boxShadowPassiveSV = useSharedValue(startBoxShadow);

    const refActive = useTestRef('ACTIVE');
    const refPassive = useTestRef('PASSIVE');

    const styleActive = useAnimatedStyle(() => {
      return {
        boxShadow: [
          withSpring(boxShadowActiveSV.value as unknown as AnimatableValue, {
            duration: 700,
          }),
        ],
      } as DefaultStyle;
    });

    const stylePassive = useAnimatedStyle(() => {
      return {
        boxShadow: [boxShadowPassiveSV.value],
      } as DefaultStyle;
    });

    useEffect(() => {
      const timeout = setTimeout(() => {
        boxShadowActiveSV.value = finalBoxShadow;
        boxShadowPassiveSV.value = finalBoxShadow;
      }, 1000);

      return () => clearTimeout(timeout);
    }, [finalBoxShadow, boxShadowActiveSV, boxShadowPassiveSV]);

    return (
      <View style={styles.container}>
        <Animated.View ref={refActive} style={[styles.animatedBox, styleActive]} />
        <Animated.View ref={refPassive} style={[styles.animatedBox, stylePassive]} />
      </View>
    );
  }

  test.each([
    {
      description: 'one boxShadow',
      finalBoxShadow: {
        blurRadius: 10,
        color: 'rgba(39, 185, 245, 0.8)',
        offsetX: -20,
        offsetY: 4,
        spreadDistance: 20,
      },
      startBoxShadow: {
        blurRadius: 7,
        color: 'rgba(245, 40, 145, 0.8)',
        offsetX: -10,
        offsetY: 6,
        spreadDistance: 10,
      },
    },
  ])('Animate', async ({ finalBoxShadow, startBoxShadow }) => {
    await render(<BoxShadowComponent finalBoxShadow={finalBoxShadow} startBoxShadow={startBoxShadow} />);

    const activeComponent = getTestComponent(Component.ACTIVE);
    const passiveComponent = getTestComponent(Component.PASSIVE);

    await wait(200);

    expect(await activeComponent.getAnimatedStyle('boxShadow')).toBe([finalBoxShadow], ComparisonMode.ARRAY);
    expect(await passiveComponent.getAnimatedStyle('boxShadow')).toBe([finalBoxShadow], ComparisonMode.ARRAY);
  });
});

const styles = StyleSheet.create({
  animatedBox: {
    backgroundColor: 'palevioletred',
    height: 100,
    margin: 30,
    width: 100,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
