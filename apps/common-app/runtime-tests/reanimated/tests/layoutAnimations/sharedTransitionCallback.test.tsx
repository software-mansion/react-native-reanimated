import { useLayoutEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type {
  CustomSharedTransitionAnimation,
  LayoutAnimationType,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
  withTiming,
} from 'react-native-reanimated';
import { Screen, ScreenContainer } from 'react-native-screens';
import { scheduleOnRN } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const DURATION = 1200;
const TARGET_WINDOW_WAIT = 500;
// LayoutAnimationType.SHARED_ELEMENT_TRANSITION, which the package exports only as a type.
const SHARED_ELEMENT_TRANSITION = 4 as LayoutAnimationType;

const androidTest = Platform.OS === 'android' ? test : test.skip;
const iosTest = Platform.OS === 'ios' ? test : test.skip;

function recordingTransition(results: boolean[]) {
  const record = (finished: boolean) => results.push(finished);
  return SharedTransition.duration(DURATION)
    .easing(Easing.linear)
    .reduceMotion(ReduceMotion.Never)
    .withCallback((finished) => {
      'worklet';
      scheduleOnRN(record, finished);
    });
}

const snapshotAnimation: CustomSharedTransitionAnimation = (values) => {
  'worklet';
  return {
    originX: withTiming(values.targetOriginX, { duration: DURATION }),
    originY: withTiming(values.targetOriginY, { duration: DURATION }),
    width: withTiming(values.targetWidth, { duration: DURATION }),
    height: withTiming(values.targetHeight, { duration: DURATION }),
  };
};

// A custom animation keeps a snapshot of its target, so its start waits until the target screen joins the window.
function recordingSnapshotTransition(results: boolean[]) {
  const record = (finished: boolean) => results.push(finished);
  return SharedTransition.custom(snapshotAnimation)
    .reduceMotion(ReduceMotion.Never)
    .withCallback((finished) => {
      'worklet';
      scheduleOnRN(record, finished);
    });
}

type Active = 'source' | 'target' | 'cover';

function Endpoint({
  name,
  transition,
  size,
}: {
  name: string;
  transition: SharedTransition;
  size: number;
}) {
  const ref = useTestRef(name);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag="callback"
      sharedTransitionStyle={transition}
      style={[styles.endpoint, { width: size, height: size }]}
    />
  );
}

function Screens({
  active,
  sourceTransition,
  targetTransition = sourceTransition,
  targetSize = 150,
  targetKey = 'target',
}: {
  active: Active;
  sourceTransition: SharedTransition;
  targetTransition?: SharedTransition;
  targetSize?: number;
  targetKey?: string;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={active === 'source'}>
        <Endpoint name="source" transition={sourceTransition} size={60} />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active === 'target'}>
        <View style={styles.targetPlace}>
          <Endpoint
            key={targetKey}
            name="target"
            transition={targetTransition}
            size={targetSize}
          />
        </View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active === 'cover'}>
        <View style={styles.cover} />
      </SharedTransitionBoundary>
    </View>
  );
}

// The second commit of the same JS task makes the source active again, before the UI thread starts the first run.
function ReversedAtOnce({
  reverse,
  sourceTransition,
  targetTransition,
}: {
  reverse: boolean;
  sourceTransition: SharedTransition;
  targetTransition: SharedTransition;
}) {
  const [reversed, setReversed] = useState(false);
  useLayoutEffect(() => {
    if (reverse) {
      setReversed(true);
    }
  }, [reverse]);
  return (
    <Screens
      active={reverse && !reversed ? 'target' : 'source'}
      sourceTransition={sourceTransition}
      targetTransition={targetTransition}
    />
  );
}

// The container keeps the target screen out of the window, like a native stack that has not shown it yet.
function DetachedTargetScreens({
  active,
  sourceTransition,
  targetTransition = sourceTransition,
  targetKey = 'target',
  showTarget = true,
}: {
  active: boolean;
  sourceTransition: SharedTransition;
  targetTransition?: SharedTransition;
  targetKey?: string;
  showTarget?: boolean;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Endpoint name="source" transition={sourceTransition} size={60} />
      </SharedTransitionBoundary>
      <ScreenContainer style={StyleSheet.absoluteFill}>
        <Screen
          activityState={0}
          freezeOnBlur={false}
          style={StyleSheet.absoluteFill}>
          <SharedTransitionBoundary isActive={active}>
            {showTarget && (
              <View style={styles.targetPlace}>
                <Endpoint
                  key={targetKey}
                  name="target"
                  transition={targetTransition}
                  size={150}
                />
              </View>
            )}
          </SharedTransitionBoundary>
        </Screen>
      </ScreenContainer>
    </View>
  );
}

async function startFlight(
  screens: (active: Active) => ReturnType<typeof Screens>
) {
  await mockAnimationTimer({ autoAdvance: false });
  await render(screens('source'));
  await waitForFrames(3);
  await render(screens('target'));
  await waitForFrames(3);
  await advanceAnimationTimer(400);
  const width = await mountedWidth('source');
  expect(width !== undefined && width > 60 && width < 150).toBe(true);
}

async function expectReportsAfterSettle(
  ...expected: [results: boolean[], values: boolean[]][]
) {
  for (const [results, values] of expected) {
    await expectEventually(() => results.length).toBe(values.length);
  }
  await waitForFrames(10);
  for (const [results, values] of expected) {
    expect(results).toBe(values);
  }
}

async function countSharedTransitionStarts() {
  const starts = makeMutable(0);
  await runOnUIBlocking(() => {
    'worklet';
    const original = global.LayoutAnimationsManager;
    global.originalLayoutAnimationsManager = original;
    global.LayoutAnimationsManager = {
      start: (tag, type, values, config) => {
        if (type === SHARED_ELEMENT_TRANSITION) {
          starts.value += 1;
        }
        original.start(tag, type, values, config);
      },
      stop: original.stop,
    };
  });
  return {
    starts,
    stop: () =>
      runOnUIBlocking(() => {
        'worklet';
        global.LayoutAnimationsManager = global.originalLayoutAnimationsManager;
      }),
  };
}

async function mountedWidth(name: string) {
  return (await getTestComponent(name).getMountedViewProps())?.width;
}

describe('Shared transition callbacks', () => {
  test('reports true once when the target layout changes during the move', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const screens = (active: Active, targetSize = 150) => (
      <Screens
        active={active}
        sourceTransition={transition}
        targetSize={targetSize}
      />
    );
    await startFlight(screens);
    await render(screens('target', 200));
    await waitForFrames(3);
    await advanceAnimationTimer(2 * DURATION);
    await expectReportsAfterSettle([results, [true]]);
  });

  test('reports false to the old builder and true to the builder of the reverse', async () => {
    const forward: boolean[] = [];
    const reverse: boolean[] = [];
    const sourceTransition = recordingTransition(forward);
    const targetTransition = recordingTransition(reverse);
    const screens = (active: Active) => (
      <Screens
        active={active}
        sourceTransition={sourceTransition}
        targetTransition={targetTransition}
      />
    );
    await startFlight(screens);
    await render(screens('source'));
    await waitForFrames(3);
    await advanceAnimationTimer(2 * DURATION);
    await expectReportsAfterSettle([forward, [false]], [reverse, [true]]);
  });

  test('reports false and then true when a new view takes the shared tag of the target', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const screens = (active: Active, targetKey = 'target') => (
      <Screens
        active={active}
        sourceTransition={transition}
        targetKey={targetKey}
      />
    );
    await startFlight(screens);
    await render(screens('target', 'newTarget'));
    await waitForFrames(3);
    await advanceAnimationTimer(2 * DURATION);
    await expectReportsAfterSettle([results, [false, true]]);
  });

  test('reports false when a new screen covers the target', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const screens = (active: Active) => (
      <Screens active={active} sourceTransition={transition} />
    );
    await startFlight(screens);
    await render(screens('cover'));
    await waitForFrames(3);
    await advanceAnimationTimer(2 * DURATION);
    await expectReportsAfterSettle([results, [false]]);
  });

  androidTest(
    'reports false to the old builder when the reverse comes before the start',
    async () => {
      const forward: boolean[] = [];
      const reverse: boolean[] = [];
      const sourceTransition = recordingTransition(forward);
      const targetTransition = recordingTransition(reverse);
      const screens = (reverseAtOnce: boolean) => (
        <ReversedAtOnce
          reverse={reverseAtOnce}
          sourceTransition={sourceTransition}
          targetTransition={targetTransition}
        />
      );
      await mockAnimationTimer({ autoAdvance: false });
      await render(screens(false));
      await waitForFrames(3);
      const { starts, stop } = await countSharedTransitionStarts();
      try {
        await render(screens(true));
        await waitForFrames(3);
        expect(starts.value).toBe(1);
      } finally {
        await stop();
      }
      await advanceAnimationTimer(2 * DURATION);
      await expectReportsAfterSettle([forward, [false]], [reverse, [true]]);
    }
  );

  iosTest.each(['removed', 'replaced'] as const)(
    'reports false once when the target of a held start is %p',
    async (change) => {
      const forward: boolean[] = [];
      const reverse: boolean[] = [];
      const replacement: boolean[] = [];
      const sourceTransition = recordingSnapshotTransition(forward);
      const targetTransition = recordingSnapshotTransition(reverse);
      const replacementTransition = recordingSnapshotTransition(replacement);
      const screens = (
        active: boolean,
        targetKey = 'target',
        showTarget = true
      ) => (
        <DetachedTargetScreens
          active={active}
          sourceTransition={sourceTransition}
          targetTransition={
            targetKey === 'target' ? targetTransition : replacementTransition
          }
          targetKey={targetKey}
          showTarget={showTarget}
        />
      );
      await render(screens(false));
      await waitForFrames(10);
      const sourceTag = getTestComponent('source').getTag();
      const parent = await RuntimeTestObserver!.observeParent(sourceTag);
      await render(screens(true));
      await waitForFrames(3);
      expect(await RuntimeTestObserver!.observeParent(sourceTag)).not.toBe(
        parent
      );
      expect(forward).toBe([]);
      if (change === 'removed') {
        await render(screens(true, 'target', false));
      } else {
        await render(screens(true, 'newTarget'));
      }
      await wait(TARGET_WINDOW_WAIT + 300);
      await expectEventually(() =>
        RuntimeTestObserver!.observeParent(sourceTag)
      ).toBe(parent);
      await expectReportsAfterSettle(
        [forward, [false]],
        [reverse, change === 'removed' ? [] : [false]],
        [replacement, []]
      );
    }
  );

  iosTest(
    'reports false to the builder of a held start that goes back',
    async () => {
      const forward: boolean[] = [];
      const reverse: boolean[] = [];
      const sourceTransition = recordingSnapshotTransition(forward);
      const targetTransition = recordingSnapshotTransition(reverse);
      const screens = (active: boolean) => (
        <DetachedTargetScreens
          active={active}
          sourceTransition={sourceTransition}
          targetTransition={targetTransition}
        />
      );
      await render(screens(false));
      await waitForFrames(10);
      const sourceTag = getTestComponent('source').getTag();
      const parent = await RuntimeTestObserver!.observeParent(sourceTag);
      await render(screens(true));
      await waitForFrames(3);
      expect(forward).toBe([]);
      await render(screens(false));
      await expectEventually(() =>
        RuntimeTestObserver!.observeParent(sourceTag)
      ).toBe(parent);
      await expectReportsAfterSettle([forward, [false]], [reverse, [true]]);
    }
  );
});

const styles = StyleSheet.create({
  container: { width: 300, height: 500 },
  endpoint: { backgroundColor: '#2277dd' },
  targetPlace: { position: 'absolute', top: 250, left: 100 },
  cover: { position: 'absolute', top: 0, left: 0, width: 10, height: 10 },
});
