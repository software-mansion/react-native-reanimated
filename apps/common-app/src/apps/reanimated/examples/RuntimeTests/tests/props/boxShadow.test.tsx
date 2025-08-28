import { useEffect } from 'react';
import { BoxShadowValue, StyleSheet, View, ViewStyle } from 'react-native';
import type { AnimatableValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import {
  describe,
  expect,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForNotify,
} from '@/apps/reanimated/examples/RuntimeTests/ReJest/RuntimeTestsApi';
import { ComparisonMode } from '@/apps/reanimated/examples/RuntimeTests/ReJest/types';

const NOTIFICATION_NAME = 'UPDATE_BOX_SHADOW';

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

    const styleActive = useAnimatedStyle<ViewStyle>(() => {
      return {
        boxShadow: [
          withSpring(
            boxShadowActiveSV.value as unknown as AnimatableValue,
            {
              duration: 600,
            },
            () => {
              notify(NOTIFICATION_NAME);
            },
          ),
        ],
      } as unknown as DefaultStyle;
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
      }, 500);

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
        color: '#ff0000ff',
        offsetX: -20,
        offsetY: 4,
        spreadDistance: 20,
        inset: false,
      },
      startBoxShadow: {
        blurRadius: 7,
        color: '#ff0000fe',
        offsetX: -10,
        offsetY: 6,
        spreadDistance: 10,
        inset: true,
      },
    },
  ])('Animate', async ({ finalBoxShadow, startBoxShadow }) => {
    await render(<BoxShadowComponent finalBoxShadow={finalBoxShadow} startBoxShadow={startBoxShadow} />);

    const activeComponent = getTestComponent(Component.ACTIVE);
    const passiveComponent = getTestComponent(Component.PASSIVE);

    const activeBoxShadow = JSON.parse(
      await activeComponent.getAnimatedStyle('boxShadow'),
    ) as unknown as BoxShadowValue[];
    const passiveBoxShadow = JSON.parse(
      await passiveComponent.getAnimatedStyle('boxShadow'),
    ) as unknown as BoxShadowValue[];

    expect(activeBoxShadow).toBe([startBoxShadow], ComparisonMode.ARRAY);
    expect(passiveBoxShadow).toBe([startBoxShadow], ComparisonMode.ARRAY);

    await waitForNotify(NOTIFICATION_NAME);

    const passiveBoxShadowFinal = JSON.parse(
      await passiveComponent.getAnimatedStyle('boxShadow'),
    ) as unknown as BoxShadowValue[];
    const activeBoxShadowFinal = JSON.parse(
      await activeComponent.getAnimatedStyle('boxShadow'),
    ) as unknown as BoxShadowValue[];

    expect(activeBoxShadowFinal).toBe([finalBoxShadow], ComparisonMode.ARRAY);
    expect(passiveBoxShadowFinal).toBe([finalBoxShadow], ComparisonMode.ARRAY);
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
