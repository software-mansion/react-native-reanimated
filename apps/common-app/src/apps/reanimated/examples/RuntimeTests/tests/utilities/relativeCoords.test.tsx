import React from 'react';
import type { FlexStyle, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import type { ComponentCoords } from 'react-native-reanimated';
import Animated, { runOnUI, measure, getRelativeCoords, useAnimatedRef, useSharedValue } from 'react-native-reanimated';
import { describe, test, expect, render, wait, registerValue, getRegisteredValue } from '../../ReJest/RuntimeTestsApi';

const REGISTERED_VALUE_KEY = 'sv';

const CoordsComponent = ({
  justifyContent,
  alignItems,
}: {
  justifyContent: FlexStyle['justifyContent'];
  alignItems: FlexStyle['alignItems'];
}) => {
  const coordsSv = useSharedValue<ComponentCoords | null>(null);
  registerValue(REGISTERED_VALUE_KEY, coordsSv);
  const bRef = useAnimatedRef();
  const sRef = useAnimatedRef();

  const onLayoutMeasure = () => {
    runOnUI(() => {
      const measured = measure(sRef);
      if (measured !== null) {
        coordsSv.value = getRelativeCoords(bRef, measured.pageX, measured.pageY);
      }
    })();
  };

  const testStyles: ViewStyle = {
    justifyContent,
    alignItems,
  };

  return (
    <Animated.View style={styles.container}>
      <Animated.View ref={bRef} style={[styles.bigBox, testStyles]}>
        <Animated.View ref={sRef} style={styles.smallBox} onLayout={onLayoutMeasure} />
      </Animated.View>
    </Animated.View>
  );
};

describe('getRelativeCoords', () => {
  test.each([
    ['flex-start', 'flex-start', 0, 0],
    ['flex-start', 'center', 50, 0],
    ['flex-start', 'flex-end', 100, 0],
    ['center', 'flex-start', 0, 50],
    ['center', 'center', 50, 50],
    ['center', 'flex-end', 100, 50],
    ['flex-end', 'flex-start', 0, 100],
    ['flex-end', 'center', 50, 100],
    ['flex-end', 'flex-end', 100, 100],
  ] as Array<[FlexStyle['justifyContent'], FlexStyle['alignItems'], number, number]>)(
    'getCoords %s',
    async ([justifyContent, alignItems, expectedValueX, expectedValueY]) => {
      await render(<CoordsComponent justifyContent={justifyContent} alignItems={alignItems} />);
      await wait(300);
      const coords = (await getRegisteredValue(REGISTERED_VALUE_KEY)).onUI;
      expect(coords).not.toBeNullable();
      if (coords) {
        expect(Math.floor((coords as unknown as ComponentCoords).x)).toBe(expectedValueX);
        expect(Math.floor((coords as unknown as ComponentCoords).y)).toBe(expectedValueY);
      }
    },
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigBox: {
    margin: 20,
    width: 200,
    height: 200,
    backgroundColor: 'purple',
  },
  smallBox: {
    width: 100,
    height: 100,
    backgroundColor: 'pink',
  },
});
