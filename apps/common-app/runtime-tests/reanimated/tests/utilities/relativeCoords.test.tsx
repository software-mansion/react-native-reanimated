import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import type { ComponentCoords } from 'react-native-reanimated';
import Animated, {
  getRelativeCoords,
  measure,
  useAnimatedRef,
} from 'react-native-reanimated';

import {
  createTestValue,
  describe,
  expect,
  render,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { scheduleOnUI } from 'react-native-worklets';

const MEASURED_NOTIFICATION = 'measured';

const CoordsComponent = ({
  justifyContent,
  alignItems,
  setCoords,
}: {
  justifyContent: ViewStyle['justifyContent'];
  alignItems: ViewStyle['alignItems'];
  setCoords: (coords: ComponentCoords | null, notification?: string) => void;
}) => {
  const bRef = useAnimatedRef();
  const sRef = useAnimatedRef();

  const onLayoutMeasure = () => {
    scheduleOnUI(() => {
      const measured = measure(sRef);
      if (measured !== null) {
        setCoords(
          getRelativeCoords(bRef, measured.pageX, measured.pageY),
          MEASURED_NOTIFICATION
        );
      }
    });
  };

  const testStyles: ViewStyle = {
    justifyContent,
    alignItems,
  };

  return (
    <Animated.View style={styles.container}>
      <Animated.View ref={bRef} style={[styles.bigBox, testStyles]}>
        <Animated.View
          ref={sRef}
          style={styles.smallBox}
          onLayout={onLayoutMeasure}
        />
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
  ] as Array<
    [ViewStyle['justifyContent'], ViewStyle['alignItems'], number, number]
  >)(
    'getCoords %s',
    async ([justifyContent, alignItems, expectedValueX, expectedValueY]) => {
      const [coords, setCoords] = createTestValue<ComponentCoords | null>(null);

      await render(
        <CoordsComponent
          justifyContent={justifyContent}
          alignItems={alignItems}
          setCoords={setCoords}
        />
      );
      await waitForNotification(MEASURED_NOTIFICATION);

      const measured = coords.value as ComponentCoords;
      expect(measured).not.toBeNullable();
      expect(Math.round(measured.x)).toBe(expectedValueX);
      expect(Math.round(measured.y)).toBe(expectedValueY);
    }
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
