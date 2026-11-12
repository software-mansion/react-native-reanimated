import type { Component, ReactElement, ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const androidTest = Platform.OS === 'android' ? test : test.skip;

function Endpoint({
  name,
  transition,
}: {
  name: 'source' | 'target' | 'candidate' | 'later';
  transition: SharedTransition;
}) {
  const ref = useTestRef(`window-${name}`);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag="layout-root"
      sharedTransitionStyle={transition}
      style={endpointStyles[name]}
    />
  );
}

function NativeRoot({
  dialog,
  children,
}: {
  dialog: boolean;
  children: ReactNode;
}) {
  return dialog ? (
    <Modal transparent animationType="none">
      <View style={styles.root}>{children}</View>
    </Modal>
  ) : (
    <View style={styles.root}>{children}</View>
  );
}

function Screens({
  active,
  sourceDialog,
  targetDialog,
  targetMounted = true,
  transition,
}: {
  active: boolean;
  sourceDialog: boolean;
  targetDialog: boolean;
  targetMounted?: boolean;
  transition: SharedTransition;
}) {
  return (
    <View style={styles.root}>
      <NativeRoot dialog={sourceDialog}>
        <SharedTransitionBoundary isActive={!active}>
          <Endpoint name="source" transition={transition} />
        </SharedTransitionBoundary>
        {sourceDialog && targetDialog && targetMounted && (
          <SharedTransitionBoundary isActive={active}>
            <Endpoint name="target" transition={transition} />
          </SharedTransitionBoundary>
        )}
      </NativeRoot>
      {(!sourceDialog || !targetDialog) && targetMounted && (
        <NativeRoot dialog={targetDialog}>
          <SharedTransitionBoundary isActive={active}>
            <Endpoint name="target" transition={transition} />
          </SharedTransitionBoundary>
        </NativeRoot>
      )}
    </View>
  );
}

function RetargetScreens({
  active,
  candidate,
  keepTarget,
  transition,
  candidateTransition,
  candidateActive = false,
  later = false,
}: {
  active: boolean;
  candidate: boolean;
  keepTarget: boolean;
  transition: SharedTransition;
  candidateTransition: SharedTransition;
  candidateActive?: boolean;
  later?: boolean;
}) {
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={!active}>
        <View collapsable={false} style={styles.sourceOffset}>
          <Endpoint name="source" transition={transition} />
        </View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active && !candidateActive}>
        {keepTarget && <Endpoint name="target" transition={transition} />}
        {candidate && (
          <Modal transparent animationType="none">
            <SharedTransitionBoundary isActive={candidateActive}>
              <Endpoint name="candidate" transition={candidateTransition} />
            </SharedTransitionBoundary>
          </Modal>
        )}
        {later && <Endpoint name="later" transition={transition} />}
      </SharedTransitionBoundary>
    </View>
  );
}

describe('Shared transitions and Android layout roots', () => {
  androidTest.each([
    [false, true, false],
    [true, false, false],
    [true, true, false],
    [false, true, true],
  ] as const)(
    'refuses source dialog ${0}, target dialog ${1}, new target ${2}',
    async ([sourceDialog, targetDialog, newTarget]) => {
      await mockAnimationTimer({ autoAdvance: false });
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      await render(
        <Screens
          active={false}
          sourceDialog={sourceDialog}
          targetDialog={targetDialog}
          targetMounted={!newTarget}
          transition={transition}
        />
      );
      await waitForFrames(3);
      if (!newTarget && targetDialog) await expectEndpoint('target', 150, 0.7);
      await render(
        <Screens
          active
          sourceDialog={sourceDialog}
          targetDialog={targetDialog}
          transition={transition}
        />
      );
      await waitForFrames();
      await expectEndpoint('source', 60, 0.6);
      await expectEndpoint('target', 150, 0.7);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([true]);
      await advanceAnimationTimer(1600);
      await expectEndpoint('source', 60, 0.6);
      await expectEndpoint('target', 150, 0.7);
      await render(
        <Screens
          active={false}
          sourceDialog={sourceDialog}
          targetDialog={targetDialog}
          transition={transition}
        />
      );
      await waitForFrames();
      await expectEndpoint('source', 60, 0.6);
      await expectEndpoint('target', 150, 0.7);
      await expectEventually(() => results.length).toBe(2);
      expect(results).toBe([true, true]);
    }
  );

  androidTest('keeps the surface-root transition enabled', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    await render(
      <Screens
        active={false}
        sourceDialog={false}
        targetDialog={false}
        transition={transition}
      />
    );
    await waitForFrames(3);
    await render(
      <Screens
        active
        sourceDialog={false}
        targetDialog={false}
        transition={transition}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(400);
    const source =
      await getTestComponent('window-source').getMountedViewProps();
    const width = source?.width;
    expect(width !== undefined && width > 60 && width < 150).toBe(true);
    expect(results).toBe([]);
    await advanceAnimationTimer(1200);
    await expectEventually(() => results.length).toBe(1);
    await expectSettledEndpoint('target', 150, 0.7);
    expect(results).toBe([true]);
  });

  androidTest(
    'skips a new navigation while the old carrier moves',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (active: boolean, candidateActive = false) => (
        <RetargetScreens
          active={active}
          candidate={candidateActive}
          candidateActive={candidateActive}
          keepTarget
          transition={transition}
          candidateTransition={transition}
        />
      );
      const { home } = await startFlight(screens);
      await render(screens(true, true));
      await waitForFrames(3);
      await expectEndpoint('candidate', 210, 0.8);
      await expectSettledEndpoint('target', 150, 0.7);
      await expectSettledEndpoint('source', 60, 0);
      await expectEventually(() => results.length).toBe(2);
      expect([...results].sort()).toBe([false, true]);
      const restored =
        await getTestComponent('window-source').getMountedViewProps();
      expect(restored?.x).toBe(home?.x, ComparisonMode.PIXEL);
      expect(restored?.y).toBe(home?.y, ComparisonMode.PIXEL);
      await advanceAnimationTimer(1600);
      expect(results.length).toBe(2);
      await render(screens(false));
      await expectSettledEndpoint('source', 60, 0.6);
      await expectEventually(() => results.length).toBe(3);
      expect(results[2]).toBe(true);
    }
  );

  androidTest(
    'accepts a supported target after refusing a retarget',
    async () => {
      const controls: boolean[][] = [];
      for (const candidate of [false, true]) {
        const results: boolean[] = [];
        const candidateResults: boolean[] = [];
        const transition = recordingTransition(results);
        const candidateTransition = recordingTransition(candidateResults);
        const screens = (
          active: boolean,
          keepTarget: boolean,
          showCandidate: boolean,
          later = false
        ) => (
          <RetargetScreens
            active={active}
            candidate={showCandidate}
            keepTarget={keepTarget}
            later={later}
            transition={transition}
            candidateTransition={candidateTransition}
          />
        );
        const { sourceTag } = await startFlight((active) =>
          screens(active, true, false)
        );
        await render(screens(true, !candidate, candidate));
        await waitForFrames(3);
        if (candidate) await expectEndpoint('candidate', 210, 0.8);
        await advanceAnimationTimer(200);
        expect(await mountedWidth(sourceTag)).toBe(105, ComparisonMode.PIXEL);
        await render(screens(true, false, candidate, true));
        await waitForFrames(3);
        await expectEndpoint('later', 120, 0);
        expect(await mountedWidth(sourceTag)).toBe(105, ComparisonMode.PIXEL);
        await advanceAnimationTimer(400);
        expect(await mountedWidth(sourceTag)).toBe(110, ComparisonMode.PIXEL);
        await advanceAnimationTimer(1600);
        await expectSettledEndpoint('later', 120, 0.5);
        if (candidate) await expectEndpoint('candidate', 210, 0.8);
        expect(candidateResults).toBe([]);
        await expectEventually(() => results[results.length - 1]).toBe(true);
        await waitForFrames(3);
        controls.push([...results]);
        await render(<View />);
        await waitForFrames(3);
      }
      expect(controls[1]).toBe(controls[0]);
    }
  );

  androidTest.each([[true], [false]] as const)(
    'refuses an unsupported retarget (old target retained: ${0})',
    async ([keepTarget]) => {
      const results: boolean[] = [];
      const candidateResults: boolean[] = [];
      const transition = recordingTransition(results);
      const candidateTransition = recordingTransition(candidateResults);
      const { sourceTag, width: widthBefore } = await startFlight((active) => (
        <RetargetScreens
          active={active}
          candidate={false}
          keepTarget
          transition={transition}
          candidateTransition={candidateTransition}
        />
      ));
      await render(
        <RetargetScreens
          active
          candidate
          keepTarget={keepTarget}
          transition={transition}
          candidateTransition={candidateTransition}
        />
      );
      await waitForFrames();
      await expectEndpoint('candidate', 210, 0.8);
      expect(await mountedWidth(sourceTag)).toBe(
        widthBefore,
        ComparisonMode.PIXEL
      );
      expect(results).toBe([]);
      expect(candidateResults).toBe([]);
      await advanceAnimationTimer(400);
      const widthAfter = await mountedWidth(sourceTag);
      expect(
        widthAfter !== undefined &&
          widthAfter > (widthBefore ?? 0) &&
          widthAfter < 150
      ).toBe(true);
      await advanceAnimationTimer(1200);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([true]);
      expect(candidateResults).toBe([]);
      await expectEndpoint('candidate', 210, 0.8);
      if (keepTarget) await expectSettledEndpoint('target', 150, 0.7);
      else await expectSettledEndpoint('source', 60, 0.6);
    }
  );
});

async function startFlight(
  screens: (active: boolean) => ReactElement<Component>
) {
  await mockAnimationTimer({ autoAdvance: false });
  await render(screens(false));
  await waitForFrames(3);
  const sourceTag = getTestComponent('window-source').getTag();
  const home = await getTestComponent('window-source').getMountedViewProps();
  await render(screens(true));
  await waitForFrames(3);
  await advanceAnimationTimer(400);
  const width = await mountedWidth(sourceTag);
  expect(width !== undefined && width > 60 && width < 150).toBe(true);
  return { sourceTag, home, width };
}

function recordingTransition(results: boolean[]) {
  const record = (finished: boolean) => results.push(finished);
  return SharedTransition.duration(1200)
    .easing(Easing.linear)
    .reduceMotion(ReduceMotion.Never)
    .withCallback((finished) => {
      'worklet';
      scheduleOnRN(record, finished);
    });
}

async function expectEndpoint(
  name: 'source' | 'target' | 'candidate' | 'later',
  width: number,
  opacity: number
) {
  const props = await getTestComponent(`window-${name}`).getMountedViewProps();
  expect(props?.width).toBe(width, ComparisonMode.PIXEL);
  expect(props?.opacity).toBe(opacity, ComparisonMode.FLOAT_DISTANCE);
}

async function expectSettledEndpoint(
  name: 'source' | 'target' | 'candidate' | 'later',
  width: number,
  opacity: number
) {
  await expectEventually(async () => {
    const props = await getTestComponent(
      `window-${name}`
    ).getMountedViewProps();
    return (
      !!props &&
      Math.abs(props.width - width) < 0.5 &&
      Math.abs(props.opacity - opacity) < 0.001
    );
  }).toBe(true);
  await expectEndpoint(name, width, opacity);
}

function mountedWidth(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false)?.width;
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sourceOffset: { marginTop: 120, marginLeft: 40 },
  later: {
    width: 120,
    height: 120,
    opacity: 0.5,
    marginTop: 100,
    backgroundColor: '#aa22bb',
  },
  source: { width: 60, height: 60, opacity: 0.6, backgroundColor: '#dd5522' },
  target: {
    marginTop: 200,
    width: 150,
    height: 150,
    opacity: 0.7,
    backgroundColor: '#2277dd',
  },
  candidate: {
    marginTop: 300,
    width: 210,
    height: 210,
    opacity: 0.8,
    backgroundColor: '#22bb77',
  },
});

const endpointStyles = {
  source: styles.source,
  target: styles.target,
  candidate: styles.candidate,
  later: styles.later,
};
