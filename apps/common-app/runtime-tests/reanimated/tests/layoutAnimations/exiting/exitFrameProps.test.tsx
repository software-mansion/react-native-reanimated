import { StyleSheet, View } from 'react-native';
import type { ExitAnimationsValues } from 'react-native-reanimated';
import Animated, { Easing, withTiming } from 'react-native-reanimated';

import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  mockAnimationTimer,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';
import { runOnUIBlocking } from '../../../../ReJest/utils/runOnUIBlocking';

const EXIT_MS = 1000;
const STEP_MS = 200;
const WIDTH = 100;
const WIDTH_CHANGE = 50;
const COLOR = '#2277dd';

function shrinkingFadeOut(values: ExitAnimationsValues) {
  'worklet';
  const config = { duration: EXIT_MS, easing: Easing.linear };
  return {
    initialValues: { opacity: 1, width: values.currentWidth },
    animations: {
      opacity: withTiming(0, config),
      width: withTiming(values.currentWidth + WIDTH_CHANGE, config),
    },
  };
}

function Exiting({ show }: { show: boolean }) {
  const ref = useTestRef('exit-frame-props');
  return (
    <View collapsable={false} style={styles.container}>
      {show && (
        <Animated.View
          ref={ref}
          exiting={shrinkingFadeOut}
          style={styles.box}
        />
      )}
    </View>
  );
}

function readMounted(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false);
  });
}

describe('Exiting animation frames of a plain view', () => {
  test('send the changed props of each exit frame to the native view', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Exiting show />);
    await waitForFrames();
    const tag = getTestComponent('exit-frame-props').getTag();
    expect(await isViewMountedNatively(tag)).toBe(true);

    await render(<Exiting show={false} />);
    await waitForFrames(3);
    for (let step = 1; step * STEP_MS < EXIT_MS; step++) {
      const progress = (step * STEP_MS) / EXIT_MS;
      await advanceAnimationTimer(STEP_MS);
      await expectEventually(
        async () => (await readMounted(tag))?.opacity,
        3000
      ).toBeWithinRange(1 - progress - 0.03, 1 - progress + 0.03);
      const props = await readMounted(tag);
      expect(props?.width).toBeWithinRange(
        WIDTH + progress * WIDTH_CHANGE - 2,
        WIDTH + progress * WIDTH_CHANGE + 2
      );
      expect(props?.backgroundColor).toBe(COLOR, ComparisonMode.COLOR);
    }

    await advanceAnimationTimer(EXIT_MS);
    await expectEventually(() => isViewMountedNatively(tag), 3000).toBe(false);
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 300 },
  box: { width: WIDTH, height: WIDTH, backgroundColor: COLOR },
});
