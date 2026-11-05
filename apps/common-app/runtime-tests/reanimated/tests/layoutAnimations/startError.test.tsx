import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const START_ERROR = 'layout animation start throws on purpose';

function Box({ exiting }: { exiting?: boolean }) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      entering={exiting ? undefined : FadeIn.duration(100)}
      exiting={exiting ? FadeOut.duration(100) : undefined}
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

    test('removes the exiting view at once', async () => {
      await render(<Box exiting />);
      await waitForFrames(3);
      const tag = getTestComponent('box').getTag();
      expect(await isViewMountedNatively(tag)).toBe(true);
      await throwFromLayoutAnimationStart();
      try {
        await render(null);
        await expectEventually(() => isViewMountedNatively(tag), 3000).toBe(
          false
        );
      } finally {
        await restoreLayoutAnimationStart();
      }
    });
  });
}

const styles = StyleSheet.create({
  box: { width: 100, height: 100, backgroundColor: '#2277dd' },
});
