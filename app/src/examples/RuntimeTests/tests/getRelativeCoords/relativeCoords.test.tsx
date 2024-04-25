import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  runOnUI,
  measure,
  getRelativeCoords,
  ComponentCoords,
  useAnimatedRef,
  useSharedValue,
} from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  expectNotNullable,
  render,
  wait,
  registerValue,
  getRegisteredValue,
} from '../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

const REGISTERED_VALUE_KEY = 'sv';

const CoordsComponent = ({ justifyContent, alignItems }: { justifyContent: string; alignItems: string }) => {
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
    justifyContent: justifyContent as ViewStyle['justifyContent'],
    alignItems: alignItems as ViewStyle['alignItems'],
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
  ])('getCoords with style: ${style}', async ([justifyContent, alignItems, expectedValueX, expectedValueY]) => {
    await render(<CoordsComponent justifyContent={justifyContent as string} alignItems={alignItems as string} />);
    await wait(300);
    const coords = (await getRegisteredValue(REGISTERED_VALUE_KEY)).onUI;
    expectNotNullable(coords);
    if (coords) {
      expect(Math.floor((coords as unknown as ComponentCoords).x)).toBe(expectedValueX);
      expect(Math.floor((coords as unknown as ComponentCoords).y)).toBe(expectedValueY);
    }
  });
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
