import { useEffect } from 'react';
import { View, StyleSheet, BoxShadowValue } from 'react-native';
import Animated, { useSharedValue, withDelay, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { ComparisonMode } from '../../ReJest/types';
import { describe, test, expect, render, useTestRef, getTestComponent, wait } from '../../ReJest/RuntimeTestsApi';

type BoxShadow = string | BoxShadowValue[];

describe.skip('animation of BoxShadow', () => {
  enum Component {
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
  }
  function BoxShadowComponent({ startBoxShadow, finalBoxShadow }: { startBoxShadow: string; finalBoxShadow: string }) {
    const boxShadowActiveSV = useSharedValue(startBoxShadow);
    const boxShadowPassiveSV = useSharedValue(startBoxShadow);

    const refActive = useTestRef('ACTIVE');
    const refPassive = useTestRef('PASSIVE');

    const styleActive = useAnimatedStyle(() => {
      return {
        boxShadow: [withSpring(boxShadowActiveSV.value, { duration: 700 })],
      };
    });

    const stylePassive = useAnimatedStyle(() => {
      return {
        boxShadow: [boxShadowPassiveSV.value],
      };
    });

    useEffect(() => {
      const timeout = setTimeout(() => {
        boxShadowActiveSV.value = finalBoxShadow;
        boxShadowPassiveSV.value = finalBoxShadow;
      }, 1000);

      return () => clearTimeout(timeout);
    }, [finalBoxShadow]);

    return (
      <View style={styles.container}>
        <Animated.View ref={refActive} style={[styles.animatedBox, styleActive]} />
        <Animated.View ref={refPassive} style={[styles.animatedBox, stylePassive]} />
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
    async ({ startBoxShadow, finalBoxShadow }: { startBoxShadow: BoxShadow; finalBoxShadow: BoxShadow }) => {
      await render(<BoxShadowComponent startBoxShadow={startBoxShadow} finalBoxShadow={finalBoxShadow} />);

      const activeComponent = getTestComponent(Component.ACTIVE);
      const passiveComponent = getTestComponent(Component.PASSIVE);

      await wait(200);

      expect(await activeComponent.getAnimatedStyle('boxShadow')).toBe([finalBoxShadow], ComparisonMode.ARRAY);
      expect(await passiveComponent.getAnimatedStyle('boxShadow')).toBe([finalBoxShadow], ComparisonMode.ARRAY);
    },
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
