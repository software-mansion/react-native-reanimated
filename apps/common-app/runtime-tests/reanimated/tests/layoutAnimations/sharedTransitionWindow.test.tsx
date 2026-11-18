import type { Component, ReactElement, ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
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
import type { PresentedFrame } from '../../../ReJest/native/NativeRuntimeTestObserver';
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
  transition,
}: {
  active: boolean;
  sourceDialog: boolean;
  targetDialog: boolean;
  separateDialogs?: boolean;
  targetMounted?: boolean;
  transition: SharedTransition;
}) {
  const sameDialog = sourceDialog && targetDialog && !separateDialogs;
  return (
    <View style={styles.root}>
      <NativeRoot dialog={sourceDialog}>
        <SharedTransitionBoundary isActive={!active}>
          <Endpoint name="source" transition={transition} />
        </SharedTransitionBoundary>
        {sameDialog && targetMounted && (
          <SharedTransitionBoundary isActive={active}>
            <Endpoint name="target" transition={transition} />
          </SharedTransitionBoundary>
        )}
      </NativeRoot>
      {!sameDialog && targetMounted && (
        <NativeRoot dialog={targetDialog}>
          <SharedTransitionBoundary isActive={active}>
            <Endpoint name="target" transition={transition} />
          </SharedTransitionBoundary>
        </NativeRoot>
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
      <ClosedMarker open={open} />
    </View>
  );
}

function TaggedView({
  name,
  sharedTag,
  transition,
  style,
  children,
}: {
  name: string;
  sharedTag: string;
  transition: SharedTransition;
  style: ViewStyle;
  children?: ReactNode;
}) {
  const ref = useTestRef(`window-${name}`);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag={sharedTag}
      sharedTransitionStyle={transition}
      style={style}>
      {children}
    </Animated.View>
  );
}

type ModalAnimation = 'none' | 'slide' | 'fade' | 'sheet';

type ModalRunOptions = {
  animation?: ModalAnimation;
  sourceParentStyle?: ViewStyle;
  nested?: boolean;
};

function modalProps(animation: ModalAnimation) {
  return animation === 'sheet'
    ? {
        animationType: 'slide' as const,
        presentationStyle: 'pageSheet' as const,
      }
    : { transparent: true, animationType: animation };
}

// The marker below the Modal shows once the Modal closes.
function ClosedMarker({ open }: { open: boolean }) {
  const ref = useTestRef('window-closed-marker');
  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.marker, { opacity: open ? 0 : 1 }]}
    />
  );
}

// The root view of the Modal shows the opacity of the Modal during a fade.
function ModalContent({ children }: { children: ReactNode }) {
  const ref = useTestRef('window-modal-content');
  return (
    <View ref={ref} collapsable={false} style={styles.root}>
      {children}
    </View>
  );
}

function ModalRunScreens({
  open,
  expanded,
  transition,
  animation = 'none',
  sourceParentStyle,
  nested = false,
}: {
  open: boolean;
  expanded: boolean;
  transition: SharedTransition;
} & ModalRunOptions) {
  return (
    <View style={styles.root}>
      <ClosedMarker open={open} />
      {open && (
        <Modal {...modalProps(animation)}>
          <ModalContent>
            <SharedTransitionBoundary isActive={!expanded}>
              <View
                collapsable={false}
                style={[styles.sourceOffset, sourceParentStyle]}>
                <TaggedView
                  name="source"
                  sharedTag="a"
                  transition={transition}
                  style={styles.source}>
                  {nested && (
                    <TaggedView
                      name="inner-source"
                      sharedTag="inner"
                      transition={transition}
                      style={styles.innerSource}
                    />
                  )}
                </TaggedView>
              </View>
            </SharedTransitionBoundary>
            <SharedTransitionBoundary isActive={expanded}>
              {expanded && (
                <TaggedView
                  name="target"
                  sharedTag="a"
                  transition={transition}
                  style={styles.target}>
                  {nested && (
                    <TaggedView
                      name="inner-target"
                      sharedTag="inner"
                      transition={transition}
                      style={styles.innerTarget}
                    />
                  )}
                </TaggedView>
              )}
            </SharedTransitionBoundary>
          </ModalContent>
        </Modal>
      )}
    </View>
  );
}

// Two sources and two targets overlap, and the second of each draws above the first.
function OverlappingRunsScreens({
  open,
  expanded,
  transition,
}: {
  open: boolean;
  expanded: boolean;
  transition: SharedTransition;
}) {
  return (
    <View style={styles.root}>
      <ClosedMarker open={open} />
      {open && (
        <Modal transparent animationType="none">
          <View style={styles.root}>
            <SharedTransitionBoundary isActive={!expanded}>
              <View collapsable={false} style={styles.sourceOffset}>
                <TaggedView
                  name="first-source"
                  sharedTag="first"
                  transition={transition}
                  style={styles.firstSource}
                />
                <TaggedView
                  name="second-source"
                  sharedTag="second"
                  transition={transition}
                  style={styles.secondSource}
                />
              </View>
            </SharedTransitionBoundary>
            <SharedTransitionBoundary isActive={expanded}>
              {expanded && (
                <View collapsable={false} style={styles.targetOffset}>
                  <TaggedView
                    name="first-target"
                    sharedTag="first"
                    transition={transition}
                    style={styles.firstTarget}
                  />
                  <TaggedView
                    name="second-target"
                    sharedTag="second"
                    transition={transition}
                    style={styles.secondTarget}
                  />
                </View>
              )}
            </SharedTransitionBoundary>
          </View>
        </Modal>
      )}
    </View>
  );
}

// The Modal has the tags "a" and "b", the screen below it has only "b".
function TwoTagScreens({
  open,
  expanded,
  belowActive = !open,
  transition,
}: {
  open: boolean;
  expanded: boolean;
  belowActive?: boolean;
  transition: SharedTransition;
}) {
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={belowActive}>
        <TaggedView
          name="b-below"
          sharedTag="b"
          transition={transition}
          style={styles.later}
        />
      </SharedTransitionBoundary>
      {open && (
        <Modal transparent animationType="none">
          <View style={styles.root}>
            <SharedTransitionBoundary isActive={!expanded}>
              <View collapsable={false} style={styles.sourceOffset}>
                <TaggedView
                  name="source"
                  sharedTag="a"
                  transition={transition}
                  style={styles.source}
                />
              </View>
            </SharedTransitionBoundary>
            <SharedTransitionBoundary isActive={expanded}>
              {expanded && (
                <TaggedView
                  name="target"
                  sharedTag="a"
                  transition={transition}
                  style={styles.target}
                />
              )}
              <TaggedView
                name="b-modal"
                sharedTag="b"
                transition={transition}
                style={styles.candidate}
              />
            </SharedTransitionBoundary>
          </View>
        </Modal>
      )}
    </View>
  );
}

// The target is in a Modal in the active boundary, and a later target can take its place outside the Modal.
function ModalTargetScreens({
  active,
  modalTarget,
  transition,
}: {
  active: boolean;
  modalTarget: boolean;
  transition: SharedTransition;
}) {
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={!active}>
        <View collapsable={false} style={styles.sourceOffset}>
          <Endpoint name="source" transition={transition} />
        </View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        {modalTarget ? (
          <Modal transparent animationType="none">
            <Endpoint name="target" transition={transition} />
          </Modal>
        ) : (
          <Endpoint name="later" transition={transition} />
        )}
      </SharedTransitionBoundary>
    </View>
  );
}

describe('Shared transitions and Android layout roots', () => {
  androidTest.each([
    [false, true, false, false],
    [true, false, false, false],
    [true, true, false, true],
    [false, true, true, false],
  ] as const)(
    'refuses source dialog ${0}, target dialog ${1}, new target ${2}, two dialogs ${3}',
    async ([sourceDialog, targetDialog, newTarget, separateDialogs]) => {
      await mockAnimationTimer({ autoAdvance: false });
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      await render(
        <Screens
          active={false}
          sourceDialog={sourceDialog}
          targetDialog={targetDialog}
          separateDialogs={separateDialogs}
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
          separateDialogs={separateDialogs}
          transition={transition}
        />
      );
      await waitForFrames();
      await expectEndpoint('source', 60, 0.6);
      await expectEndpoint('target', 150, 0.7);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([false]);
      await advanceAnimationTimer(1600);
      await expectEndpoint('source', 60, 0.6);
      await expectEndpoint('target', 150, 0.7);
      await render(
        <Screens
          active={false}
          sourceDialog={sourceDialog}
          targetDialog={targetDialog}
          separateDialogs={separateDialogs}
          transition={transition}
        />
      );
      await waitForFrames();
      await expectEndpoint('source', 60, 0.6);
      await expectEndpoint('target', 150, 0.7);
      await expectEventually(() => results.length).toBe(2);
      expect(results).toBe([false, false]);
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
      expect(results).toBe([false, false]);
      const restored =
        await getTestComponent('window-source').getMountedViewProps();
      expect(restored?.x).toBe(home?.x, ComparisonMode.PIXEL);
      expect(restored?.y).toBe(home?.y, ComparisonMode.PIXEL);
      await advanceAnimationTimer(1600);
      expect(results.length).toBe(2);
      await render(screens(false));
      await expectSettledEndpoint('source', 60, 0.6);
      await expectEventually(() => results.length).toBe(3);
      expect(results).toBe([false, false, false]);
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

describe('Shared transitions inside an iOS Modal', () => {
  iosTest('flies back to the source when the run reverses', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    await mockAnimationTimer({ autoAdvance: false });
    await renderInModal(transition, { active: false });
    const home = await homeOf('window-source');
    await renderInModal(transition, { active: true });
    await advanceAnimationTimer(400);
    await renderInModal(transition, { active: false });
    const start = await runOnUIBlocking(() => {
      'worklet';
      return global._obtainMountedViewProps(home.tag, false);
    });
    await advanceAnimationTimer(600);
    await expectCarrier(
      home.tag,
      ((start?.x ?? 0) + SOURCE_IN_MODAL.x) / 2,
      ((start?.y ?? 0) + SOURCE_IN_MODAL.y) / 2,
      ((start?.width ?? 0) + 60) / 2
    );
    await advanceAnimationTimer(599);
    await expectCarrier(home.tag, SOURCE_IN_MODAL.x, SOURCE_IN_MODAL.y, 60);
    await advanceAnimationTimer(400);
    await expectSettledEndpoint('source', 60, 0.6);
    await expectEventually(() => results.length).toBe(2);
    expect(results).toBe([false, true]);
    await expectLandedAtHome(home);
  });
});

describe('Shared transitions in a Modal that closes', () => {
  test('ends the run when the Modal closes, with the moving view where it is on screen on iOS', async () => {
    await expectModalLeavesWithMovingView({});
  });

  test('ends the runs when a run of another tag starts from the closing Modal, with the moving view in place on iOS', async () => {
    const results: boolean[] = [];
    const transition = recordingTransition(results);
    const screens = (open: boolean, expanded: boolean) => (
      <TwoTagScreens open={open} expanded={expanded} transition={transition} />
    );
    await mockAnimationTimer({ autoAdvance: false });
    await render(screens(false, false));
    await waitForFrames(3);
    await render(screens(true, false));
    await waitForFrames(3);
    const sourceTag = getTestComponent('window-source').getTag();
    await render(screens(true, true));
    await waitForFrames(3);
    await advanceAnimationTimer(400);
    const targetTag = getTestComponent('window-target').getTag();
    const frames = await recordPresentedFrames([sourceTag, targetTag], () =>
      closeUntilUnmounted(screens(false, true), [sourceTag, targetTag])
    );
    expectOnScreenWhileModalShows(frames, [0], 1);
    await advanceAnimationTimer(1300);
    await expectEventually(() => results.length).toBe(2);
    // On Android, the run of "b" cannot leave the layout root of the Modal.
    expect([...results].sort()).toBe(
      Platform.OS === 'ios' ? [false, true] : [false, false]
    );
  });

  iosTest(
    'keeps the Modal on screen after the mount in which a source leaves it',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (open: boolean, belowActive: boolean) => (
        <TwoTagScreens
          open={open}
          expanded
          belowActive={belowActive}
          transition={transition}
        />
      );
      // No boundary is active below the Modal when it opens, so nothing flies into it.
      await mockAnimationTimer({ autoAdvance: false });
      await render(screens(false, false));
      await waitForFrames(3);
      await render(screens(true, false));
      await waitForFrames(3);
      const belowTag = getTestComponent('window-b-below').getTag();
      const modalViewTag = getTestComponent('window-target').getTag();
      const frames = await recordPresentedFrames([belowTag, modalViewTag], () =>
        closeUntilUnmounted(screens(false, true), [modalViewTag])
      );
      const heldFrames = frames.filter(
        ([below, modalView]) => below?.opacity === 0 && modalView !== null
      );
      expect(heldFrames.length > 0).toBe(true);
      await advanceAnimationTimer(1300);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([true]);
    }
  );

  iosTest(
    'keeps the Modal on screen when it closes after the source of its run unmounts',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const { sourceTag } = await startFlight((active) =>
        modalScreens(transition, { active })
      );
      await renderInModal(transition, { active: true, keepSource: false });
      const targetTag = getTestComponent('window-target').getTag();
      const markerTag = getTestComponent('window-closed-marker').getTag();
      const frames = await recordPresentedFrames(
        [sourceTag, targetTag, markerTag],
        () =>
          closeUntilUnmounted(
            modalScreens(transition, {
              active: true,
              keepSource: false,
              open: false,
            }),
            [targetTag]
          )
      );
      expectOnScreenWhileModalShows(frames, [0], 1);
      expectHeldAfterClose(frames, 1);
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([false]);
    }
  );

  iosTest(
    'keeps the old target hidden when its Modal closes and a later target takes its place',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (active: boolean, modalTarget: boolean) => (
        <ModalTargetScreens
          active={active}
          modalTarget={modalTarget}
          transition={transition}
        />
      );
      await mockAnimationTimer({ autoAdvance: false });
      await render(screens(false, true));
      await waitForFrames(3);
      await render(screens(true, true));
      await waitForFrames(3);
      await advanceAnimationTimer(400);
      const targetTag = getTestComponent('window-target').getTag();
      const frames = await recordPresentedFrames([targetTag], () =>
        closeUntilUnmounted(screens(true, false), [targetTag])
      );
      for (const [target] of frames) {
        if (target) {
          expect(target.opacity).toBe(0, ComparisonMode.FLOAT_DISTANCE);
        }
      }
      await advanceAnimationTimer(1300);
      await expectSettledEndpoint('later', 120, 0.5);
    }
  );

  iosTest(
    'closes a sliding Modal with the moving view where it is on screen',
    async () => {
      await expectModalLeavesWithMovingView({ animation: 'slide' });
    }
  );

  iosTest(
    'keeps the look of the moving view in a scaled and translucent parent when the Modal closes',
    async () => {
      await expectModalLeavesWithMovingView({
        sourceParentStyle: styles.scaledTranslucentParent,
      });
    }
  );

  iosTest(
    'keeps the clip of the moving view from a clipped source when the Modal closes',
    async () => {
      await expectModalLeavesWithMovingView({
        sourceParentStyle: styles.clippingParent,
      });
    }
  );

  iosTest(
    'closes the Modal with a nested moving view where it is on screen',
    async () => {
      await expectModalLeavesWithMovingView({ nested: true });
    }
  );

  iosTest(
    'keeps the draw order of two overlapping moving views when the Modal closes',
    async () => {
      const results: boolean[] = [];
      const transition = recordingTransition(results);
      const screens = (open: boolean, expanded: boolean) => (
        <OverlappingRunsScreens
          open={open}
          expanded={expanded}
          transition={transition}
        />
      );
      await mockAnimationTimer({ autoAdvance: false });
      await render(screens(true, false));
      await waitForFrames(3);
      const firstTag = getTestComponent('window-first-source').getTag();
      const secondTag = getTestComponent('window-second-source').getTag();
      await render(screens(true, true));
      await waitForFrames(3);
      await advanceAnimationTimer(400);
      const targetTag = getTestComponent('window-first-target').getTag();
      const frames = await recordPresentedFrames(
        [firstTag, secondTag, targetTag],
        () => closeUntilUnmounted(screens(false, true), [targetTag])
      );
      expectOnScreenWhileModalShows(frames, [0, 1], 2);
      for (const [first, second] of frames) {
        if (first && second && first.parentTag === second.parentTag) {
          expect(first.indexInParent < second.indexInParent).toBe(true);
        }
      }
      await expectEventually(() => results.length).toBe(2);
    }
  );

  for (const animation of ['slide', 'fade', 'sheet'] as const) {
    iosTest(
      `closes a Modal during its ${animation} presentation with the moving view where it is`,
      async () => {
        await expectModalLeavesWithMovingView({ animation }, true);
      }
    );
  }
});

const SOURCE_IN_MODAL = { x: 40, y: 120 };

// The run in the Modal moves until the Modal closes, after the presentation or while it runs.
async function expectModalLeavesWithMovingView(
  modal: ModalRunOptions,
  closesWhilePresenting = false
) {
  const results: boolean[] = [];
  const transition = recordingTransition(results);
  const screens = (open: boolean, expanded: boolean) => (
    <ModalRunScreens
      open={open}
      expanded={expanded}
      transition={transition}
      {...modal}
    />
  );
  await mockAnimationTimer({ autoAdvance: false });
  await render(screens(true, false));
  if (closesWhilePresenting) {
    await waitForFrames(1);
  } else {
    await wait(700);
  }
  const movingTags = [
    getTestComponent('window-source').getTag(),
    ...(modal.nested ? [getTestComponent('window-inner-source').getTag()] : []),
  ];
  await render(screens(true, true));
  await waitForFrames(3);
  await advanceAnimationTimer(400);
  const targetTag = getTestComponent('window-target').getTag();
  const markerTag = getTestComponent('window-closed-marker').getTag();
  const contentTag = getTestComponent('window-modal-content').getTag();
  const frames = await recordPresentedFrames(
    [...movingTags, targetTag, markerTag, contentTag],
    () => closeUntilUnmounted(screens(false, true), [targetTag])
  );
  const movingIndexes = movingTags.map((_, index) => index);
  const targetIndex = movingTags.length;
  if (closesWhilePresenting) {
    expectMovesWithPresentedModal(frames, movingIndexes, targetIndex);
  } else {
    expectOnScreenWhileModalShows(frames, movingIndexes, targetIndex);
  }
  expectHeldAfterClose(frames, targetIndex);
  await expectEventually(() => results.length).toBe(movingTags.length);
  expect(results.every((finished) => !finished)).toBe(true);
  if (closesWhilePresenting) {
    await waitForDismissal(markerTag);
  }
}

// The marker is the view after the view at modalIndex. On iOS, the Modal stays on screen after the mount of the
// close.
function expectHeldAfterClose(
  frames: ReadonlyArray<ReadonlyArray<PresentedFrame | null>>,
  modalIndex: number
) {
  if (Platform.OS !== 'ios') {
    return;
  }
  const heldFrames = frames.filter(
    (frame) =>
      frame[modalIndex + 1]?.opacity === 1 && frame[modalIndex] !== null
  );
  expect(heldFrames.length > 0).toBe(true);
}

// Returns the first frame after the close. The marker is the view after the view at modalIndex.
function expectClosedDuringPresentation(
  frames: ReadonlyArray<ReadonlyArray<PresentedFrame | null>>,
  modalIndex: number,
  markerIndex: number
) {
  const closeIndex = frames.findIndex(
    (frame) => frame[markerIndex]?.opacity === 1
  );
  expect(closeIndex > 0).toBe(true);
  expect(frames[closeIndex - 1]?.[modalIndex]?.inContainerTransition).toBe(
    true
  );
  return closeIndex;
}

// The Modal still presents when it closes. From the close on, the moving views are part of the Modal: they move with
// it and take its opacity during a fade. Their offset to the view at modalIndex changes only in the frame of the
// close, by at most the way that the Modal moves in that frame. The marker and the root view of the Modal follow the
// view at modalIndex.
function expectMovesWithPresentedModal(
  frames: ReadonlyArray<ReadonlyArray<PresentedFrame | null>>,
  movingIndexes: number[],
  modalIndex: number
) {
  const closeIndex = expectClosedDuringPresentation(
    frames,
    modalIndex,
    modalIndex + 1
  );
  const before = frames[closeIndex - 1];
  const modalBefore = before[modalIndex];
  const offsets = new Map<number, { x: number; y: number }>();
  for (const frame of frames.slice(closeIndex)) {
    const modalView = frame[modalIndex];
    if (!modalView || !modalBefore) {
      continue;
    }
    expect(modalView.opacity).toBe(0, ComparisonMode.FLOAT_DISTANCE);
    for (const index of movingIndexes) {
      const view = frame[index];
      const expected = before[index];
      expect(view !== null && expected !== null).toBe(true);
      if (!view || !expected) {
        continue;
      }
      const content = frame[modalIndex + 2];
      expectSameLook(view, {
        ...expected,
        opacity: expected.opacity * (content?.opacity ?? 1),
      });
      const offset = { x: view.x - modalView.x, y: view.y - modalView.y };
      const first = offsets.get(index);
      if (first) {
        expect(offset.x).toBe(first.x, ComparisonMode.PIXEL);
        expect(offset.y).toBe(first.y, ComparisonMode.PIXEL);
        continue;
      }
      offsets.set(index, offset);
      const viewShift = Math.hypot(view.x - expected.x, view.y - expected.y);
      const modalShift = Math.hypot(
        modalView.x - modalBefore.x,
        modalView.y - modalBefore.y
      );
      expect(viewShift <= modalShift + 0.5).toBe(true);
    }
  }
}

// UIKit dismisses a Modal closed during its presentation after the presentation, and a later test must not start
// under it.
async function waitForDismissal(markerTag: number) {
  await expectEventually(async () => {
    const marker = await RuntimeTestObserver!.observePresentedFrame(markerTag);
    return (
      marker !== null && marker.opacity === 1 && !marker.inContainerTransition
    );
  }).toBe(true);
}

async function recordPresentedFrames(
  viewTags: number[],
  during: () => Promise<void>
) {
  await RuntimeTestObserver!.startFrameRecording(viewTags);
  await waitForFrames(2);
  let frames: ReadonlyArray<ReadonlyArray<PresentedFrame | null>> = [];
  try {
    await during();
  } finally {
    frames = (await RuntimeTestObserver!.takeFrameRecording()) ?? [];
  }
  return frames;
}

// While the view at modalIndex is on screen, the views at movingIndexes keep the frame and the look with which the
// screen showed them before the close, and the view at modalIndex stays hidden.
function expectOnScreenWhileModalShows(
  frames: ReadonlyArray<ReadonlyArray<PresentedFrame | null>>,
  movingIndexes: number[],
  modalIndex: number
) {
  const before = frames[0];
  for (const frame of frames) {
    const modalView = frame[modalIndex];
    if (!modalView) {
      continue;
    }
    expect(modalView.opacity).toBe(0, ComparisonMode.FLOAT_DISTANCE);
    for (const index of movingIndexes) {
      const view = frame[index];
      const expected = before[index];
      expect(view !== null && expected !== null).toBe(true);
      if (!view || !expected) {
        continue;
      }
      expect(view.x).toBe(expected.x, ComparisonMode.PIXEL);
      expect(view.y).toBe(expected.y, ComparisonMode.PIXEL);
      expectSameLook(view, expected);
    }
  }
}

function expectSameLook(view: PresentedFrame, expected: PresentedFrame) {
  expect(view.width).toBe(expected.width, ComparisonMode.PIXEL);
  expect(view.height).toBe(expected.height, ComparisonMode.PIXEL);
  expect(view.visibleWidth).toBe(expected.visibleWidth, ComparisonMode.PIXEL);
  expect(view.visibleHeight).toBe(expected.visibleHeight, ComparisonMode.PIXEL);
  expect(view.opacity).toBe(expected.opacity, ComparisonMode.FLOAT_DISTANCE);
}

async function closeUntilUnmounted(
  screens: ReactElement<Component>,
  viewTags: number[]
) {
  await render(screens);
  await expectEventually(async () => {
    const widths = await Promise.all(viewTags.map(mountedWidth));
    return widths.every((width) => width === undefined);
  }).toBe(true);
}

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

function recordingTransition(results: boolean[], duration = 1200) {
  const record = (finished: boolean) => results.push(finished);
  return SharedTransition.duration(duration)
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
  modalOffset: { flex: 1, marginTop: 80, marginLeft: 30 },
  sourceOffset: { marginTop: 120, marginLeft: 40 },
  sourceTransform: { transform: [{ translateX: 20 }] },
  scaledTranslucentParent: { opacity: 0.5, transform: [{ scale: 0.5 }] },
  marker: { width: 10, height: 10, backgroundColor: '#222222' },
  clippingParent: { width: 40, height: 40, overflow: 'hidden' },
  targetOffset: { position: 'absolute', top: 360, left: 20 },
  firstSource: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: '#dd5522',
  },
  secondSource: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 60,
    height: 60,
    backgroundColor: '#2277dd',
  },
  firstTarget: {
    position: 'absolute',
    width: 150,
    height: 150,
    backgroundColor: '#dd5522',
  },
  secondTarget: {
    position: 'absolute',
    left: 40,
    top: 40,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
  innerSource: { width: 20, height: 20, backgroundColor: '#ffcc00' },
  innerTarget: {
    marginTop: 30,
    marginLeft: 30,
    width: 50,
    height: 50,
    backgroundColor: '#22bb77',
  },
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
