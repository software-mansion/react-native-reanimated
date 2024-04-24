import React from 'react';
import { StyleSheet } from 'react-native';
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
  render,
  wait,
  registerValue,
  getRegisteredValue,
} from '../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

const REGISTERED_VALUE_KEY = 'sv';

const CoordsComponent = ({ testStyle }: { testStyle: object }) => {
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

  return (
    <Animated.View style={styles.container}>
      <Animated.View ref={bRef} style={[styles.bigBox, testStyle]}>
        <Animated.View ref={sRef} style={styles.smallBox} onLayout={onLayoutMeasure} />
      </Animated.View>
    </Animated.View>
  );
};

describe('getRelativeCoords', () => {
  test.each(TEST_CASES)('getCoords with style: ${style}', async ({ style, expectedValueX, expectedValueY }) => {
    await render(<CoordsComponent testStyle={style} />);
    await wait(300);
    const coords = (await getRegisteredValue(REGISTERED_VALUE_KEY)).onUI;
    expect(coords != null ? 1 : 0).toBe(1); // makeshift nullcheck
    if (coords) {
      expect(Math.floor((coords as unknown as ComponentCoords).x)).toBe(expectedValueX);
      expect(Math.floor((coords as unknown as ComponentCoords).y)).toBe(expectedValueY);
    }
  });
});

const TEST_CASES = [
  {
    style: {
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    expectedValueX: 0,
    expectedValueY: 0,
  },
  {
    style: {
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    expectedValueX: 50,
    expectedValueY: 0,
  },
  {
    style: {
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    expectedValueX: 100,
    expectedValueY: 0,
  },
  {
    style: {
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    expectedValueX: 0,
    expectedValueY: 50,
  },
  {
    style: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    expectedValueX: 50,
    expectedValueY: 50,
  },
  {
    style: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    expectedValueX: 100,
    expectedValueY: 50,
  },
  {
    style: {
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
    },
    expectedValueX: 0,
    expectedValueY: 100,
  },
  {
    style: {
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    expectedValueX: 50,
    expectedValueY: 100,
  },
  {
    style: {
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    expectedValueX: 100,
    expectedValueY: 100,
  },
];

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
