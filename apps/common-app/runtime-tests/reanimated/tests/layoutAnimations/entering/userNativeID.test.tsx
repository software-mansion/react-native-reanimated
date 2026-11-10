import { StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import {
  callTracker,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  getTrackerCallCount,
  render,
  test,
  useTestRef,
  wait,
} from '../../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../../ReJest/utils/runOnUIBlocking';

const DURATION_MS = 300;
const NARROW_WIDTH = 100;
const WIDE_WIDTH = 200;

enum Tracker {
  EnteringFinished = 'user-native-id-entering-finished',
  ExitingFinished = 'user-native-id-exiting-finished',
  LayoutFinished = 'user-native-id-layout-finished',
}

const entering = FadeIn.duration(DURATION_MS)
  .reduceMotion(ReduceMotion.Never)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      callTracker(Tracker.EnteringFinished);
    }
  });

const exiting = FadeOut.duration(DURATION_MS)
  .reduceMotion(ReduceMotion.Never)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      callTracker(Tracker.ExitingFinished);
    }
  });

const layout = LinearTransition.duration(DURATION_MS)
  .reduceMotion(ReduceMotion.Never)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      callTracker(Tracker.LayoutFinished);
    }
  });

type NativeIDProps = { nativeID?: string };

const WITHOUT_OWN_NATIVE_ID: [string, NativeIDProps][] = [
  ['no nativeID', {}],
  ['nativeID={undefined}', { nativeID: undefined }],
];

const NATIVE_ID_CASES: [string, NativeIDProps][] = [
  ...WITHOUT_OWN_NATIVE_ID,
  ['nativeID "custom"', { nativeID: 'custom' }],
];

function EnteringBox({ nativeIDProps }: { nativeIDProps: NativeIDProps }) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      {...nativeIDProps}
      entering={entering}
      style={styles.box}
    />
  );
}

function EnteringBoxInTouchable() {
  const ref = useTestRef('box');
  return (
    <TouchableWithoutFeedback>
      <Animated.View ref={ref} entering={entering} style={styles.box} />
    </TouchableWithoutFeedback>
  );
}

function ExitingBox({ nativeIDProps }: { nativeIDProps: NativeIDProps }) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      {...nativeIDProps}
      exiting={exiting}
      style={styles.box}
    />
  );
}

function LayoutBox({
  nativeIDProps,
  wide,
}: {
  nativeIDProps: NativeIDProps;
  wide: boolean;
}) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      {...nativeIDProps}
      layout={layout}
      style={[styles.box, { width: wide ? WIDE_WIDTH : NARROW_WIDTH }]}
    />
  );
}

function readPresentedProps(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, true);
  });
}

async function expectEnteringAnimation() {
  const tag = getTestComponent('box').getTag();
  await wait(DURATION_MS / 2);
  const midway = await readPresentedProps(tag);
  expect(midway?.opacity).toBeWithinRange(0.05, 0.95);
  await expectFinishedOnce(Tracker.EnteringFinished);
  await render(null);
}

async function expectFinishedOnce(tracker: Tracker) {
  await expectEventually(
    () => getTrackerCallCount(tracker),
    DURATION_MS * 5
  ).toBeCalledUI(1);
}

describe('Layout animations of a component with its own nativeID', () => {
  test.each(WITHOUT_OWN_NATIVE_ID)(
    'runs the entering animation, **${0}**',
    async ([, nativeIDProps]) => {
      await render(<EnteringBox nativeIDProps={nativeIDProps} />);
      await expectEnteringAnimation();
    }
  );

  test('runs the entering animation inside TouchableWithoutFeedback', async () => {
    await render(<EnteringBoxInTouchable />);
    await expectEnteringAnimation();
  });

  test('shows the view at once with its own nativeID', async () => {
    await render(<EnteringBox nativeIDProps={{ nativeID: 'custom' }} />);
    const tag = getTestComponent('box').getTag();
    await wait(DURATION_MS / 2);
    expect((await readPresentedProps(tag))?.opacity).toBe(1);
    await render(null);
  });

  test.each(NATIVE_ID_CASES)(
    'runs the exiting animation, **${0}**',
    async ([, nativeIDProps]) => {
      await render(<ExitingBox nativeIDProps={nativeIDProps} />);
      await wait(100);
      const tag = getTestComponent('box').getTag();
      await render(null);
      await wait(DURATION_MS / 2);
      const midway = await readPresentedProps(tag);
      expect(midway?.opacity).toBeWithinRange(0.05, 0.95);
      await expectFinishedOnce(Tracker.ExitingFinished);
    }
  );

  test.each(NATIVE_ID_CASES)(
    'runs the layout animation, **${0}**',
    async ([, nativeIDProps]) => {
      await render(<LayoutBox nativeIDProps={nativeIDProps} wide={false} />);
      await wait(100);
      const tag = getTestComponent('box').getTag();
      await render(<LayoutBox nativeIDProps={nativeIDProps} wide />);
      await wait(DURATION_MS / 2);
      const midway = await readPresentedProps(tag);
      expect(midway?.width).toBeWithinRange(NARROW_WIDTH + 10, WIDE_WIDTH - 10);
      await expectFinishedOnce(Tracker.LayoutFinished);
      await render(null);
    }
  );
});

const styles = StyleSheet.create({
  box: { width: NARROW_WIDTH, height: 100, backgroundColor: '#2277dd' },
});
