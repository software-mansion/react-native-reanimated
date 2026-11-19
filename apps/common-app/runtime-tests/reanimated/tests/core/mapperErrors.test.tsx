import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const BOX_REF = 'MAPPER_ERRORS_BOX';
const INITIAL_WIDTH = 100;
const THROWING_WIDTH = 200;
const MAPPER_ERROR = 'error thrown by a mapper';

let widthValue: SharedValue<number> | null = null;

describe('errors thrown by mappers', () => {
  const debugTest = __DEV__ ? test : test.skip;

  debugTest(
    'runs the dirty mappers that follow a mapper that throws',
    async () => {
      await render(<BoxAfterThrowingReaction />);
      const box = getTestComponent(BOX_REF);
      await expectEventually(() => box.getAnimatedStyle('width')).toBe(
        INITIAL_WIDTH,
        ComparisonMode.PIXEL
      );

      await expect(() => {
        widthValue!.value = THROWING_WIDTH;
      }).toThrow(MAPPER_ERROR);

      await expectEventually(() => box.getAnimatedStyle('width')).toBe(
        THROWING_WIDTH,
        ComparisonMode.PIXEL
      );
    }
  );
});

function BoxAfterThrowingReaction() {
  const width = useSharedValue(INITIAL_WIDTH);
  widthValue = width;
  const ref = useTestRef(BOX_REF);
  useAnimatedReaction(
    () => width.value,
    (current) => {
      if (current === THROWING_WIDTH) {
        throw new Error(MAPPER_ERROR);
      }
    }
  );
  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    width: INITIAL_WIDTH,
    height: 50,
    backgroundColor: 'teal',
  },
});
