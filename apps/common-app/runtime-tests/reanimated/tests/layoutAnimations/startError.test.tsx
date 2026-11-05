import { StyleSheet } from 'react-native';
import type {
  EntryExitAnimationFunction,
  EntryOrExitLayoutType,
  LayoutAnimation,
} from 'react-native-reanimated';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  render,
  test,
  notify,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const START_ERROR = 'layout animation start throws on purpose';
const ON_START_ERROR = 'layout animation onStart throws on purpose';
const FADE_IN_FINISHED = 'startErrorFadeInFinished';

const throwingOnStart: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0 },
    animations: {
      opacity: {
        current: 0,
        onStart: () => {
          throw new Error(ON_START_ERROR);
        },
        onFrame: () => true,
      },
    },
  } as unknown as LayoutAnimation;
};

const notifyingFadeIn = FadeIn.duration(100).withCallback((finished) => {
  'worklet';
  if (finished) {
    notify(FADE_IN_FINISHED);
  }
});

function Box({
  exiting,
  entering = exiting ? undefined : FadeIn.duration(100),
}: {
  exiting?: boolean;
  entering?: EntryOrExitLayoutType;
}) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      entering={entering}
      exiting={exiting ? FadeOut.duration(100) : undefined}
      style={styles.box}
    />
  );
}

function readFrameTimestampOnUI() {
  return runOnUIBlocking(() => {
    'worklet';
    return global.__frameTimestamp;
  });
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

    test('drops the JS state of an animation whose onStart throws', async () => {
      await render(<Box entering={throwingOnStart} />);
      await waitForFrames(5);
      expect(await readFrameTimestampOnUI()).toBe(undefined);
      await render(null);

      await render(<Box entering={notifyingFadeIn} />);
      await waitForNotification(FADE_IN_FINISHED);
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
        await expectEventually(() => isViewMountedNatively(tag), 1000).toBe(
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
