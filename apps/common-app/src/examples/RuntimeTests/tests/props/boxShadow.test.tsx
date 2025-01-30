// TODO: Enable this test after RuntimeTests are implemented on Fabric

import { useEffect } from 'react';
import type { BoxShadowValue } from 'react-native';
import type { AnimatableValue } from 'react-native-reanimated';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';
import { ComparisonMode } from '../../../../apps/reanimated/examples/RuntimeTests/ReJest/types';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  render,
  useTestRef,
  getTestComponent,
  wait,
} from '../../../../apps/reanimated/examples/RuntimeTests/ReJest/RuntimeTestsApi';

describe.skip('animation of BoxShadow', () => {
  enum Component {
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
  }
  function BoxShadowComponent({
    startBoxShadow,
    finalBoxShadow,
  }: {
    startBoxShadow: BoxShadowValue;
    finalBoxShadow: BoxShadowValue;
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
        <Animated.View
          ref={refActive}
          style={[styles.animatedBox, styleActive]}
        />
        <Animated.View
          ref={refPassive}
          style={[styles.animatedBox, stylePassive]}
        />
      </View>
    );
  }

  test.each([
    {
      startBoxShadow: {
        offsetX: -10,
        offsetY: 6,
        blurRadius: 7,
        spreadDistance: 10,
        color: 'rgba(245, 40, 145, 0.8)',
      },

      finalBoxShadow: {
        offsetX: -20,
        offsetY: 4,
        blurRadius: 10,
        spreadDistance: 20,
        color: 'rgba(39, 185, 245, 0.8)',
      },

      description: 'one boxShadow',
    },
  ])(
    '${description}, from ${startBoxShadow} to ${finalBoxShadow}',
    async ({
      startBoxShadow,
      finalBoxShadow,
    }: {
      startBoxShadow: BoxShadowValue;
      finalBoxShadow: BoxShadowValue;
    }) => {
      await render(
        <BoxShadowComponent
          startBoxShadow={startBoxShadow}
          finalBoxShadow={finalBoxShadow}
        />
      );

      const activeComponent = getTestComponent(Component.ACTIVE);
      const passiveComponent = getTestComponent(Component.PASSIVE);

      await wait(200);

      expect(await activeComponent.getAnimatedStyle('boxShadow')).toBe(
        [finalBoxShadow],
        ComparisonMode.ARRAY
      );
      expect(await passiveComponent.getAnimatedStyle('boxShadow')).toBe(
        [finalBoxShadow],
        ComparisonMode.ARRAY
      );
    }
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedBox: {
    backgroundColor: 'palevioletred',
    width: 100,
    height: 100,
    margin: 30,
  },
});
