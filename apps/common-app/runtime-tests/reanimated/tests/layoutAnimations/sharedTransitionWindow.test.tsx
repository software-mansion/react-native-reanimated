import type { Component, ReactElement, ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
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
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const androidTest = Platform.OS === 'android' ? test : test.skip;
const iosTest = Platform.OS === 'ios' ? test : test.skip;

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
  separateDialogs = false,
  targetMounted = true,
  sourceMounted = true,
  nestDialogs = false,
  candidate = false,
  candidateDialog = false,
  nextDialog = false,
  transition,
}: {
  active: boolean;
  sourceDialog: boolean;
  targetDialog: boolean;
  separateDialogs?: boolean;
  targetMounted?: boolean;
  sourceMounted?: boolean;
  nestDialogs?: boolean;
  candidate?: boolean;
  candidateDialog?: boolean;
  nextDialog?: boolean;
  transition: SharedTransition;
}) {
  const candidateView = <Endpoint name="candidate" transition={transition} />;
  const sameDialog =
    sourceDialog && targetDialog && !separateDialogs && !nestDialogs;
  const target = targetMounted && (
    <NativeRoot dialog={targetDialog}>
      <SharedTransitionBoundary isActive={active && !nextDialog}>
        <Endpoint name="target" transition={transition} />
        {candidate &&
          (candidateDialog ? (
            <OpaqueModal>{candidateView}</OpaqueModal>
          ) : (
            candidateView
          ))}
      </SharedTransitionBoundary>
    </NativeRoot>
  );
  return (
    <View style={styles.root}>
      {sourceMounted && (
        <NativeRoot dialog={sourceDialog}>
          <SharedTransitionBoundary isActive={!active}>
            <Endpoint name="source" transition={transition} />
          </SharedTransitionBoundary>
          {sameDialog && targetMounted && (
            <SharedTransitionBoundary isActive={active}>
              <Endpoint name="target" transition={transition} />
            </SharedTransitionBoundary>
          )}
          {nestDialogs && target}
        </NativeRoot>
      )}
      {!sameDialog && !nestDialogs && target}
      {nextDialog && (
        <OpaqueModal>
          <SharedTransitionBoundary isActive>
            {candidateView}
          </SharedTransitionBoundary>
        </OpaqueModal>
      )}
    </View>
  );
}

// The UI thread makes frames while the JS thread renders, so their acknowledgements wait for the commit.
function BlockJSThread({ milliseconds }: { milliseconds: number }) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    // Busy wait.
  }
  return null;
}

function ModalMarker() {
  const ref = useTestRef('window-marker');
  return <View ref={ref} collapsable={false} style={styles.marker} />;
}

function OpaqueModal({ children }: { children: ReactNode }) {
  return (
    <Modal animationType="none">
      <View style={styles.opaqueRoot}>{children}</View>
    </Modal>
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
  keepSource = true,
  sourceTransform = false,
  modalTarget = false,
}: {
  active: boolean;
  candidate: boolean;
  keepTarget: boolean;
  transition: SharedTransition;
  candidateTransition: SharedTransition;
  candidateActive?: boolean;
  later?: boolean;
  keepSource?: boolean;
  sourceTransform?: boolean;
  modalTarget?: boolean;
}) {
  return (
    <View style={styles.root}>
      {keepSource && (
        <SharedTransitionBoundary isActive={!active}>
          <View
            collapsable={false}
            style={[
              styles.sourceOffset,
              sourceTransform && styles.sourceTransform,
            ]}>
            <Endpoint name="source" transition={transition} />
          </View>
        </SharedTransitionBoundary>
      )}
      <SharedTransitionBoundary
        isActive={active && !candidateActive && !modalTarget}>
        {keepTarget && <Endpoint name="target" transition={transition} />}
        {candidate && (
          <Modal transparent animationType="none">
            {modalTarget && (
              <SharedTransitionBoundary isActive>
                <Endpoint name="later" transition={transition} />
              </SharedTransitionBoundary>
            )}
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

// The container detaches the screen of the source, like a native stack that hides a covered screen.
function OffWindowSourceScreens({
  active,
  transition,
}: {
  active: boolean;
  transition: SharedTransition;
}) {
  return (
    <View style={styles.root}>
      <ScreenContainer style={StyleSheet.absoluteFill}>
        <Screen enabled activityState={0} style={StyleSheet.absoluteFill}>
          <SharedTransitionBoundary isActive={!active}>
            <Endpoint name="source" transition={transition} />
          </SharedTransitionBoundary>
        </Screen>
      </ScreenContainer>
      <SharedTransitionBoundary isActive={active}>
        <Endpoint name="target" transition={transition} />
      </SharedTransitionBoundary>
    </View>
  );
}

function InModal({
  open = true,
  children,
}: {
  open?: boolean;
  children: ReactNode;
}) {
  const ref = useTestRef('window-modal-offset');
  return (
    <View style={styles.root}>
      <View ref={ref} collapsable={false} style={styles.modalOffset}>
        {open && (
          <Modal transparent animationType="none">
            {children}
          </Modal>
        )}
      </View>
    </View>
  );
}

describe('Shared transitions and Android layout roots', () => {
  androidTest.each([
    ['the screen to a Modal', false, true, false, false],
    ['a Modal to the screen', true, false, false, false],
    ['a Modal to another Modal', true, true, false, true],
    ['a Modal to a Modal inside it', true, true, false, false, true],
    [
      'the screen to a Modal that mounts with the target',
      false,
      true,
      true,
      false,
    ],
  ] as const)(
    'flies from ${0} and back',
    async ([
      ,
      sourceDialog,
      targetDialog,
      newTarget,
      separateDialogs,
      nestDialogs = false,
    ]) => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (active: boolean, targetMounted = true) => (
        <Screens
          active={active}
          sourceDialog={sourceDialog}
          targetDialog={targetDialog}
          separateDialogs={separateDialogs}
          nestDialogs={nestDialogs}
          targetMounted={targetMounted}
          transition={transition}
        />
      );
      await mockAnimationTimer({ autoAdvance: false });
      await render(screens(false, !newTarget));
      await waitForFrames(3);
      const home = await homeOf('window-source');
      const sourceOnScreen = await locationOnScreen(home.tag);
      await render(screens(true));
      await waitForFrames(3);
      const target = await homeOf('window-target');
      const targetOnScreen = await locationOnScreen(target.tag);
      expect(await RuntimeTestObserver!.observeParent(home.tag)).not.toBe(
        home.parent
      );
      await expectOnScreen(home.tag, sourceOnScreen);
      await advanceAnimationTimer(1199);
      await expectOnScreen(home.tag, targetOnScreen);
      await advanceAnimationTimer(400);
      await expectSettledEndpoint('target', 150, 0.7);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([true]);
      await expectLandedAtHome(home);
      await render(screens(false));
      await waitForFrames(3);
      await expectOnScreen(target.tag, targetOnScreen);
      await advanceAnimationTimer(1600);
      await expectSettledEndpoint('source', 60, 0.6);
      await expectEventually(() => results.length).toBe(2);
      expect(results).toBe([true, true]);
      await expectLandedAtHome(target);
    }
  );

  androidTest('moves a flight between windows to a new target', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const screens = (active: boolean, candidate = false) => (
      <Screens
        active={active}
        sourceDialog={false}
        targetDialog
        candidate={candidate}
        transition={transition}
      />
    );
    const { sourceTag } = await startFlight(screens);
    await render(screens(true, true));
    await waitForFrames(3);
    const candidateOnScreen = await locationOnScreen(
      getTestComponent('window-candidate').getTag()
    );
    await advanceAnimationTimer(1199);
    await expectOnScreen(sourceTag, candidateOnScreen);
    expect(await mountedWidth(sourceTag)).toBe(210, ComparisonMode.PIXEL);
    await advanceAnimationTimer(400);
    await expectSettledEndpoint('candidate', 210, 0.8);
    await expectSettledEndpoint('target', 150, 0.7);
    await expectEventually(() => results.length).toBe(2);
    expect(results).toBe([false, true]);
  });

  androidTest.each([
    ['a retarget into a new Modal', true, false, 0.7],
    ['a navigation into a new Modal', false, true, 0],
  ] as const)(
    'raises a flight between windows above ${0}',
    async ([, candidateDialog, nextDialog, targetOpacity]) => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (active: boolean, next = false) => (
        <Screens
          active={active}
          sourceDialog={false}
          targetDialog
          candidate={next && candidateDialog}
          candidateDialog={candidateDialog}
          nextDialog={next && nextDialog}
          transition={transition}
        />
      );
      const { sourceTag } = await startFlight(screens);
      await render(screens(true, true));
      await waitForFrames(3);
      const candidateTag = getTestComponent('window-candidate').getTag();
      const candidateOnScreen = await locationOnScreen(candidateTag);
      expect(
        await RuntimeTestObserver!.observeWindowAbove(sourceTag, candidateTag)
      ).toBe(true);
      await advanceAnimationTimer(1199);
      await expectOnScreen(sourceTag, candidateOnScreen);
      expect(await mountedWidth(sourceTag)).toBe(210, ComparisonMode.PIXEL);
      await advanceAnimationTimer(400);
      await expectSettledEndpoint('candidate', 210, 0.8);
      await expectSettledEndpoint('target', 150, targetOpacity);
      await expectEventually(() => results[results.length - 1]).toBe(true);
      expect(results.filter((finished) => finished).length).toBe(1);
    }
  );

  androidTest(
    'raises a flight between windows above a Modal that holds the source',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (active: boolean) => (
        <Screens
          active={active}
          sourceDialog={false}
          targetDialog
          transition={transition}
        />
      );
      await mockAnimationTimer({ autoAdvance: false });
      await render(screens(false));
      await waitForFrames(3);
      await render(screens(true));
      await waitForFrames(3);
      await advanceAnimationTimer(1600);
      await expectEventually(() => results.length).toBe(1);
      await render(<View />);
      await waitForFrames(3);
      const modalFirst = (back: boolean) => (
        <View style={styles.root}>
          <SharedTransitionBoundary isActive={back}>
            {back && <Endpoint name="target" transition={transition} />}
          </SharedTransitionBoundary>
          <OpaqueModal>
            <ModalMarker />
            <SharedTransitionBoundary isActive={!back}>
              <Endpoint name="candidate" transition={transition} />
            </SharedTransitionBoundary>
          </OpaqueModal>
        </View>
      );
      await render(modalFirst(false));
      await waitForFrames(3);
      const candidateTag = getTestComponent('window-candidate').getTag();
      await render(modalFirst(true));
      await waitForFrames(3);
      expect(
        await RuntimeTestObserver!.observeWindowAbove(
          candidateTag,
          getTestComponent('window-marker').getTag()
        )
      ).toBe(true);
      await advanceAnimationTimer(1600);
      await expectSettledEndpoint('target', 150, 0.7);
      await expectEventually(() => results.length).toBe(2);
      expect(results).toBe([true, true]);
    }
  );

  androidTest(
    'flies to the last place of a target whose Modal closes',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (active: boolean, targetMounted = true) => (
        <Screens
          active={active}
          sourceDialog={false}
          targetDialog
          targetMounted={targetMounted}
          transition={transition}
        />
      );
      await mockAnimationTimer({ autoAdvance: false });
      await render(screens(false));
      await waitForFrames(3);
      const home = await homeOf('window-source');
      await render(screens(true));
      await waitForFrames(3);
      await advanceAnimationTimer(400);
      await render(screens(true, false));
      await waitForFrames(3);
      expect(results).toBe([]);
      await advanceAnimationTimer(1600);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([true]);
      await expectLandedAtHome(home);
      await waitForFrames(3);
      expect(results).toBe([true]);
    }
  );

  androidTest(
    'keeps flying to the screen when the Modal of the source closes',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (active: boolean, sourceMounted = true) => (
        <Screens
          active={active}
          sourceDialog
          targetDialog={false}
          sourceMounted={sourceMounted}
          transition={transition}
        />
      );
      const { sourceTag } = await startFlight(screens);
      await render(screens(true, false));
      await waitForFrames(3);
      expect((await mountedWidth(sourceTag)) !== undefined).toBe(true);
      await advanceAnimationTimer(1600);
      await expectSettledEndpoint('target', 150, 0.7);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([true]);
      await expectEventually(
        async () => (await mountedWidth(sourceTag)) === undefined
      ).toBe(true);
    }
  );

  androidTest('reverses a flight between windows', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const screens = (active: boolean) => (
      <Screens
        active={active}
        sourceDialog={false}
        targetDialog
        transition={transition}
      />
    );
    await mockAnimationTimer({ autoAdvance: false });
    await render(screens(false));
    await waitForFrames(3);
    const home = await homeOf('window-source');
    const sourceOnScreen = await locationOnScreen(home.tag);
    await render(screens(true));
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    await render(screens(false));
    await waitForFrames(3);
    await advanceAnimationTimer(1199);
    await expectOnScreen(home.tag, sourceOnScreen);
    await advanceAnimationTimer(400);
    await expectSettledEndpoint('source', 60, 0.6);
    await expectEventually(() => results.length).toBe(2);
    expect([...results].sort()).toBe([false, true]);
    await expectLandedAtHome(home);
  });

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
    'starts a new flight into a Modal while the old carrier moves',
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
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([false]);
      await expectSettledEndpoint('source', 60, 0);
      const restored =
        await getTestComponent('window-source').getMountedViewProps();
      expect(restored?.x).toBe(home?.x, ComparisonMode.PIXEL);
      expect(restored?.y).toBe(home?.y, ComparisonMode.PIXEL);
      await advanceAnimationTimer(1600);
      await expectSettledEndpoint('candidate', 210, 0.8);
      await expectEventually(() => results.length).toBe(2);
      expect(results).toBe([false, true]);
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

describe('Shared transitions inside one Android Modal', () => {
  androidTest('flies between two views in one Modal', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    await mockAnimationTimer({ autoAdvance: false });
    await renderInModal(transition, { active: false });
    await expectEndpoint('target', 150, 0);
    const home = await homeOf('window-source');
    const target =
      await getTestComponent('window-target').getMountedViewProps();
    const modalHost = await modalHostOf(home.tag);
    await renderInModal(transition, { active: true });
    const layer = await RuntimeTestObserver!.observeParent(home.tag);
    expect(layer).not.toBe(home.parent);
    expect(await RuntimeTestObserver!.observeParent(layer ?? -1)).toBe(
      modalHost
    );
    await expectCarrier(home.tag, SOURCE_IN_MODAL.x, SOURCE_IN_MODAL.y, 60);
    await advanceAnimationTimer(600);
    await expectCarrier(
      home.tag,
      (SOURCE_IN_MODAL.x + (target?.x ?? 0)) / 2,
      (SOURCE_IN_MODAL.y + (target?.y ?? 0)) / 2,
      105
    );
    await advanceAnimationTimer(1000);
    await expectSettledEndpoint('target', 150, 0.7);
    await expectEventually(() => results.length).toBe(1);
    expect(results).toBe([true]);
    await expectLandedAtHome(home);
    await expectEndpoint('source', 60, 0);
    await renderInModal(transition, { active: true, open: false });
    await expectEventually(() =>
      RuntimeTestObserver!.observeParent(layer ?? -1)
    ).toBe(null);
  });

  androidTest('flies back to the source in one Modal', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    await mockAnimationTimer({ autoAdvance: false });
    await renderInModal(transition, { active: false });
    await renderInModal(transition, { active: true });
    await advanceAnimationTimer(1600);
    await expectSettledEndpoint('target', 150, 0.7);
    const home = await homeOf('window-target');
    await renderInModal(transition, { active: false });
    expect(await RuntimeTestObserver!.observeParent(home.tag)).not.toBe(
      home.parent
    );
    await expectCarrier(home.tag, home.x, home.y, 150);
    await advanceAnimationTimer(600);
    await expectCarrier(
      home.tag,
      (SOURCE_IN_MODAL.x + home.x) / 2,
      (SOURCE_IN_MODAL.y + home.y) / 2,
      105
    );
    await advanceAnimationTimer(1000);
    await expectSettledEndpoint('source', 60, 0.6);
    await expectEventually(() => results.length).toBe(2);
    expect(results).toBe([true, true]);
    await expectLandedAtHome(home);
  });

  androidTest('flies to a target mounted in the same commit', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    await mockAnimationTimer({ autoAdvance: false });
    await renderInModal(transition, { active: false, keepTarget: false });
    const home = await homeOf('window-source');
    await renderInModal(transition, { active: true });
    await advanceAnimationTimer(600);
    expect(await mountedWidth(home.tag)).toBe(105, ComparisonMode.PIXEL);
    await advanceAnimationTimer(1000);
    await expectSettledEndpoint('target', 150, 0.7);
    await expectEventually(() => results.length).toBe(1);
    expect(results).toBe([true]);
    await expectLandedAtHome(home);
  });

  androidTest('ends the flight when the Modal closes', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const { sourceTag } = await startFlight((active) =>
      modalScreens(transition, { active })
    );
    await renderInModal(transition, { active: true, open: false });
    await expectEventually(() => results.length).toBe(1);
    expect(results).toBe([false]);
    expect((await mountedWidth(sourceTag)) === undefined).toBe(true);
    await advanceAnimationTimer(1600);
    await waitForFrames(3);
    expect(results).toBe([false]);
  });

  androidTest(
    'ends the flight when the Modal closes before the last frames are in the mount queue',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const { sourceTag } = await startFlight((active) =>
        modalScreens(transition, { active })
      );
      await runOnUIBlocking(() => {
        'worklet';
        global.autoAdvanceAnimationTimer = true;
      });
      await render(
        <>
          {modalScreens(transition, { active: true, open: false })}
          <BlockJSThread milliseconds={100} />
        </>
      );
      await waitForFrames(3);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([false]);
      await expectEventually(
        async () => (await mountedWidth(sourceTag)) === undefined
      ).toBe(true);
      await advanceAnimationTimer(1600);
      await waitForFrames(3);
      expect(results).toBe([false]);
    }
  );

  androidTest('refuses a retarget into another Modal', async () => {
    const results: boolean[] = [];
    const candidateResults: boolean[] = [];
    const transition = recordingTransition(results);
    const candidateTransition = recordingTransition(candidateResults);
    const { sourceTag, width: widthBefore } = await startFlight((active) =>
      modalScreens(transition, { active, candidateTransition })
    );
    await renderInModal(transition, {
      active: true,
      candidate: true,
      candidateTransition,
    });
    await expectEndpoint('candidate', 210, 0.8);
    expect(await mountedWidth(sourceTag)).toBe(
      widthBefore,
      ComparisonMode.PIXEL
    );
    await advanceAnimationTimer(400);
    expect(await mountedWidth(sourceTag)).toBe(120, ComparisonMode.PIXEL);
    await advanceAnimationTimer(1200);
    await expectSettledEndpoint('target', 150, 0.7);
    await expectEventually(() => results.length).toBe(1);
    expect(results).toBe([true]);
    expect(candidateResults).toBe([]);
    await expectEndpoint('candidate', 210, 0.8);
  });

  androidTest('ends a retained carrier when the Modal closes', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const { sourceTag } = await startFlight((active) =>
      modalScreens(transition, { active })
    );
    await renderInModal(transition, { active: true, keepSource: false });
    expect((await mountedWidth(sourceTag)) !== undefined).toBe(true);
    const beforeClose = [...results];
    await renderInModal(transition, {
      active: true,
      keepSource: false,
      open: false,
    });
    await expectEventually(() => results.length).toBe(beforeClose.length + 1);
    expect(results).toBe([...beforeClose, false]);
    expect((await mountedWidth(sourceTag)) === undefined).toBe(true);
    await advanceAnimationTimer(1600);
    await waitForFrames(3);
    expect(results).toBe([...beforeClose, false]);
  });

  androidTest('flies from a transformed parent in one Modal', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    await mockAnimationTimer({ autoAdvance: false });
    await renderInModal(transition, { active: false, sourceTransform: true });
    const home = await homeOf('window-source');
    const target =
      await getTestComponent('window-target').getMountedViewProps();
    await renderInModal(transition, { active: true, sourceTransform: true });
    await expectCarrier(home.tag, SOURCE_IN_MODAL.x, SOURCE_IN_MODAL.y, 60);
    expect(await translateXOf(home.tag)).toBe(20, ComparisonMode.PIXEL);
    await advanceAnimationTimer(1199);
    await expectCarrier(home.tag, target?.x ?? 0, target?.y ?? 0, 150);
    expect(await translateXOf(home.tag)).toBe(0, ComparisonMode.PIXEL);
    await advanceAnimationTimer(400);
    await expectSettledEndpoint('target', 150, 0.7);
    await expectEventually(() => results.length).toBe(1);
    expect(results).toBe([true]);
    await expectLandedAtHome(home);
    expect(await translateXOf(home.tag)).toBe(0, ComparisonMode.PIXEL);
  });

  androidTest(
    'starts a new carrier when a navigation moves into a Modal',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (
        active: boolean,
        candidate = false,
        modalTarget = false
      ) => (
        <RetargetScreens
          active={active}
          candidate={candidate}
          modalTarget={modalTarget}
          keepTarget
          transition={transition}
          candidateTransition={transition}
        />
      );
      const { sourceTag } = await startFlight(screens);
      await render(screens(true, true));
      await waitForFrames(3);
      await expectEndpoint('candidate', 210, 0.8);
      await render(screens(true, true, true));
      await waitForFrames(3);
      const candidateTag = getTestComponent('window-candidate').getTag();
      await expectEventually(
        async () => Math.abs(((await mountedWidth(sourceTag)) ?? 0) - 60) < 0.5
      ).toBe(true);
      await advanceAnimationTimer(600);
      expect(await mountedWidth(candidateTag)).toBe(165, ComparisonMode.PIXEL);
      await advanceAnimationTimer(1000);
      await expectSettledEndpoint('later', 120, 0.5);
      await expectEventually(() => results.length).toBe(2);
      expect([...results].sort()).toBe([false, true]);
    }
  );
});

describe('Shared transitions from a source off the window', () => {
  iosTest('reports false once and shows the target in its place', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    await render(
      <OffWindowSourceScreens active={false} transition={transition} />
    );
    await waitForFrames(3);
    await render(<OffWindowSourceScreens active transition={transition} />);
    await waitForFrames(3);
    await expectEndpoint('target', 150, 0.7);
    await expectEventually(() => results.length).toBe(1);
    expect(results).toBe([false]);
    await advanceAnimationTimer(1600);
    await waitForFrames(3);
    await expectEndpoint('target', 150, 0.7);
    expect(results).toBe([false]);
  });
});

const SOURCE_IN_MODAL = { x: 40, y: 120 };

async function modalHostOf(tag: number) {
  const offsetTag = getTestComponent('window-modal-offset').getTag();
  let ancestor = await RuntimeTestObserver!.observeParent(tag);
  while (ancestor !== null) {
    const parent = await RuntimeTestObserver!.observeParent(ancestor);
    if (parent === offsetTag) {
      return ancestor;
    }
    ancestor = parent;
  }
  return null;
}

async function locationOnScreen(tag: number) {
  const location = await RuntimeTestObserver!.observeLocationOnScreen(tag);
  return { x: location?.x ?? NaN, y: location?.y ?? NaN };
}

async function expectOnScreen(tag: number, expected: { x: number; y: number }) {
  const actual = await locationOnScreen(tag);
  expect(actual.x).toBe(expected.x, ComparisonMode.PIXEL);
  expect(actual.y).toBe(expected.y, ComparisonMode.PIXEL);
}

async function translateXOf(tag: number) {
  return (await RuntimeTestObserver!.observeTransform(tag))?.translateX;
}

function modalScreens(
  transition: SharedTransition,
  {
    active,
    keepTarget = true,
    candidate = false,
    open = true,
    candidateTransition = transition,
    keepSource = true,
    sourceTransform = false,
  }: {
    active: boolean;
    keepTarget?: boolean;
    candidate?: boolean;
    open?: boolean;
    candidateTransition?: SharedTransition;
    keepSource?: boolean;
    sourceTransform?: boolean;
  }
) {
  return (
    <InModal open={open}>
      <RetargetScreens
        active={active}
        candidate={candidate}
        keepTarget={keepTarget}
        keepSource={keepSource}
        sourceTransform={sourceTransform}
        transition={transition}
        candidateTransition={candidateTransition}
      />
    </InModal>
  );
}

async function renderInModal(
  transition: SharedTransition,
  options: Parameters<typeof modalScreens>[1]
) {
  await render(modalScreens(transition, options));
  await waitForFrames(3);
}

async function homeOf(name: string) {
  const component = getTestComponent(name);
  const tag = component.getTag();
  const props = await component.getMountedViewProps();
  const parent = await RuntimeTestObserver!.observeParent(tag);
  return { tag, parent, x: props?.x ?? 0, y: props?.y ?? 0 };
}

async function expectCarrier(tag: number, x: number, y: number, width: number) {
  const props = await runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false);
  });
  expect(props?.x).toBe(x, ComparisonMode.PIXEL);
  expect(props?.y).toBe(y, ComparisonMode.PIXEL);
  expect(props?.width).toBe(width, ComparisonMode.PIXEL);
}

async function expectLandedAtHome(home: Awaited<ReturnType<typeof homeOf>>) {
  await expectEventually(
    async () =>
      (await RuntimeTestObserver!.observeParent(home.tag)) === home.parent
  ).toBe(true);
  const props = await runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(home.tag, false);
  });
  expect(props?.x).toBe(home.x, ComparisonMode.PIXEL);
  expect(props?.y).toBe(home.y, ComparisonMode.PIXEL);
}

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
  opaqueRoot: { flex: 1, backgroundColor: '#ffffff' },
  marker: { width: 10, height: 10 },
  modalOffset: { flex: 1, marginTop: 80, marginLeft: 30 },
  sourceOffset: { marginTop: 120, marginLeft: 40 },
  sourceTransform: { transform: [{ translateX: 20 }] },
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
