import { useEffect } from 'react';
import { View, StyleSheet, BoxShadowValue } from 'react-native';
import Animated, { useSharedValue, withDelay, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { ComparisonMode } from '../../ReJest/types';
import { describe, test, expect, render, useTestRef, getTestComponent, wait } from '../../ReJest/RuntimeTestsApi';

type BoxShadow = string | BoxShadowValue[];

describe('animation of BoxShadow', () => {
  enum Component {
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
  }
  function BoxShadowComponent({ startBoxShadow, finalBoxShadow }: { startBoxShadow: string; finalBoxShadow: string }) {
    const boxShadowActiveSV = useSharedValue(startBoxShadow);

    const refActive = useTestRef('ACTIVE');

    const styleActive = useAnimatedStyle(() => {
      return {
        boxShadow: [withSpring(boxShadowActiveSV.value, { duration: 700 })],
      };
    });

    useEffect(() => {
      const timeout = setTimeout(() => {
        boxShadowActiveSV.value = finalBoxShadow;
      }, 2000);

      return () => clearTimeout(timeout);
    }, [finalBoxShadow]);

    return (
      <View style={styles.container}>
        <Animated.View ref={refActive} style={[styles.animatedBox, styleActive]} />
      </View>
    );
  }

  interface TestCase {
    startBoxShadow: BoxShadow;
    finalBoxShadow: BoxShadow;
    description: string;
    compilerApi: boolean;
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

      await wait(5000);

      expect(await activeComponent.getAnimatedStyle('boxShadow')).toBe(finalBoxShadow, ComparisonMode.STRING);
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
