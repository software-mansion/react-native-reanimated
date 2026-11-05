import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const START_ERROR = 'layout animation start throws on purpose';

function Box() {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      entering={FadeIn.duration(100)}
      style={styles.box}
    />
  );
}

async function throwFromLayoutAnimationStart() {
  await runOnUIBlocking(() => {
    'worklet';
    global.originalLayoutAnimationsManager = global.LayoutAnimationsManager;
    global.LayoutAnimationsManager = {
      start: () => {
        throw new Error(START_ERROR);
      },
      stop: global.originalLayoutAnimationsManager.stop,
    };
  });
}

async function restoreLayoutAnimationStart() {
  await runOnUIBlocking(() => {
    'worklet';
    global.LayoutAnimationsManager = global.originalLayoutAnimationsManager;
  });
}

if (__DEV__) {
  describe('Layout animation start that throws', () => {
    test('is reported without terminating the app', async () => {
      await throwFromLayoutAnimationStart();
      try {
        await render(<Box />);
        await waitForFrames(5);
      } finally {
        await restoreLayoutAnimationStart();
      }
      expect(typeof getTestComponent('box').getTag()).toBe('number');
      await render(null);
    });
  });
}

const styles = StyleSheet.create({
  box: { width: 100, height: 100, backgroundColor: '#2277dd' },
});
