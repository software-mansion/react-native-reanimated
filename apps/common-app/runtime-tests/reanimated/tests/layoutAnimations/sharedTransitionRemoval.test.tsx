import { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { Screen, ScreenStack } from 'react-native-screens';
import { runOnUISync } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  mockAnimationTimer,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const transition = SharedTransition.duration(1500);
const exit = FadeOut.duration(1500);
const siblingExit = FadeOut.duration(400);
const nativeStackTransition = SharedTransition.duration(10000);

type ExitKind = 'none' | 'parent' | 'source' | 'child';

function Target() {
  const ref = useTestRef('target');
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={ref}
        sharedTransitionTag="removal"
        sharedTransitionStyle={transition}
        style={styles.target}
      />
    </SharedTransitionBoundary>
  );
}

function Screens({
  active,
  removed = false,
  exitKind = 'none',
  removeSiblings = false,
  childRemoved = false,
  childExit = exit,
  advanceBeforeCommit,
}: {
  active: boolean;
  removed?: boolean;
  exitKind?: ExitKind;
  removeSiblings?: boolean;
  childRemoved?: boolean;
  childExit?: FadeOut;
  advanceBeforeCommit?: number;
}) {
  const parent = useTestRef('parent');
  const source = useTestRef('source');
  const child = useTestRef('child');
  const first = useTestRef('first');
  const exiting = useTestRef('exiting');
  const last = useTestRef('last');
  return (
    <View style={styles.container}>
      {!(removed && exitKind === 'parent') && (
        <Animated.View
          ref={parent}
          collapsable={false}
          exiting={exitKind === 'parent' ? exit : undefined}>
          <SharedTransitionBoundary isActive={!active}>
            {!removeSiblings && (
              <View ref={first} collapsable={false} style={styles.sibling} />
            )}
            {!removed && (
              <Animated.View
                ref={source}
                sharedTransitionTag="removal"
                sharedTransitionStyle={transition}
                exiting={exitKind === 'source' ? exit : undefined}
                style={styles.source}>
                {!childRemoved && (
                  <Animated.View
                    ref={child}
                    collapsable={false}
                    style={styles.child}
                    exiting={exitKind === 'child' ? childExit : undefined}
                  />
                )}
              </Animated.View>
            )}
            {!removeSiblings && (
              <Animated.View
                ref={exiting}
                exiting={siblingExit}
                style={styles.sibling}
              />
            )}
            <View ref={last} collapsable={false} style={styles.sibling} />
          </SharedTransitionBoundary>
        </Animated.View>
      )}
      {active && <Target />}
      {advanceBeforeCommit !== undefined && (
        <AdvanceBeforeCommit milliseconds={advanceBeforeCommit} />
      )}
    </View>
  );
}

// Animations get the time and run their frames before React commits this render.
function AdvanceBeforeCommit({ milliseconds }: { milliseconds: number }) {
  const advanced = useRef(false);
  if (!advanced.current) {
    advanced.current = true;
    advanceAndWaitForUIFrames(milliseconds);
  }
  return null;
}

function advanceAndWaitForUIFrames(milliseconds: number) {
  const framesBefore = runOnUISync(() => {
    'worklet';
    global.mockedAnimationTimestamp! += milliseconds;
    return global.framesCount ?? 0;
  });
  const readFrames = () =>
    runOnUISync(() => {
      'worklet';
      return global.framesCount ?? 0;
    });
  const deadline = performance.now() + 3000;
  while (readFrames() < framesBefore + 3) {
    if (performance.now() > deadline) {
      throw new Error('The UI thread ran no frames before the commit.');
    }
  }
}

function readMounted(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false);
  });
}

async function startTransition(exitKind: ExitKind = 'none', childExit = exit) {
  await mockAnimationTimer({ autoAdvance: false });
  await render(
    <Screens active={false} exitKind={exitKind} childExit={childExit} />
  );
  await waitForFrames();
  const tags = {
    source: getTestComponent('source').getTag(),
    child: getTestComponent('child').getTag(),
    parent: getTestComponent('parent').getTag(),
  };
  await render(<Screens active exitKind={exitKind} childExit={childExit} />);
  await waitForFrames(3);
  await advanceAnimationTimer(500);
  await expectEventually(async () => {
    const props = await readMounted(tags.source);
    return (
      !!props && props.opacity > 0 && props.width > 65 && props.width < 145
    );
  }).toBe(true);
  return tags;
}

async function expectGone(tags: number[]) {
  for (const tag of tags) {
    await expectEventually(() => isViewMountedNatively(tag)).toBe(false);
  }
}

async function expectTargetRestored() {
  await expectEventually(async () => {
    const props = await getTestComponent('target').getMountedViewProps();
    return !!props && props.opacity === 1 && Math.abs(props.width - 150) < 0.5;
  }).toBe(true);
}

function NativeStackTarget() {
  const target = useTestRef('stack-target');
  return (
    <Animated.View
      ref={target}
      sharedTransitionTag="native-stack-removal"
      sharedTransitionStyle={nativeStackTransition}
      style={styles.target}
    />
  );
}

function NativeStack({
  pushed,
  prepared = false,
  removed = false,
}: {
  pushed: boolean;
  prepared?: boolean;
  removed?: boolean;
}) {
  const parent = useTestRef('stack-parent');
  const sourceScreen = useTestRef('stack-source-screen');
  const source = useTestRef('stack-source');
  const child = useTestRef('stack-child');
  const survivor = useTestRef('stack-survivor');
  return (
    <View style={styles.container}>
      {!removed && (
        <View
          ref={parent}
          collapsable={false}
          style={{ flex: 1, width: prepared ? 301 : 300 }}>
          <ScreenStack style={{ flex: 1 }}>
            <Screen
              ref={sourceScreen}
              activityState={2}
              onAppear={() => notify('removal-source-appeared')}
              style={{ flex: 1 }}>
              <SharedTransitionBoundary isActive={!pushed}>
                <Animated.View
                  ref={source}
                  sharedTransitionTag="native-stack-removal"
                  sharedTransitionStyle={nativeStackTransition}
                  style={styles.source}>
                  <View ref={child} collapsable={false} style={styles.child} />
                </Animated.View>
              </SharedTransitionBoundary>
            </Screen>
            {pushed && (
              <Screen activityState={2} style={{ flex: 1 }}>
                <SharedTransitionBoundary isActive>
                  <NativeStackTarget />
                </SharedTransitionBoundary>
              </Screen>
            )}
          </ScreenStack>
        </View>
      )}
      <View ref={survivor} collapsable={false} style={styles.sibling} />
    </View>
  );
}

function TaggedListItem({ name }: { name: string }) {
  const ref = useTestRef(`list-${name}`);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag={`list-${name}`}
      sharedTransitionStyle={transition}
      style={{ width: 20, height: 20 }}
    />
  );
}

function TaggedList({ items }: { items: string[] }) {
  return (
    <View collapsable={false} style={{ width: 300, height: 100 }}>
      <SharedTransitionBoundary isActive>
        {items.map((name) => (
          <TaggedListItem key={name} name={name} />
        ))}
      </SharedTransitionBoundary>
    </View>
  );
}

describe('Removal during a shared transition', () => {
  const iosTest =
    Platform.OS === 'ios' && RuntimeTestObserver ? test : test.skip;

  iosTest(
    'removes a snapshotted native stack while its carrier is detached',
    async () => {
      await render(<NativeStack pushed={false} />);
      await waitForNotification('removal-source-appeared');
      await render(<NativeStack pushed={false} prepared />);
      await waitForFrames(3);
      const tags = [
        'stack-parent',
        'stack-source-screen',
        'stack-source',
        'stack-child',
      ].map((name) => getTestComponent(name).getTag());
      expect(tags.every((tag) => tag > 0)).toBe(true);
      await render(<NativeStack pushed prepared />);
      await expectEventually(async () => {
        const props = await readMounted(tags[2]);
        return !!props && props.width > 60 && props.width < 140;
      }).toBe(true);
      expect(
        (await getTestComponent('stack-target').getMountedViewProps())?.opacity
      ).toBe(0);
      await RuntimeTestObserver!.startUnmountRecording();
      await render(<NativeStack pushed prepared removed />);
      await expectGone(tags);
      // React Native Screens snapshots the screen when it is removed, so the removed root
      // must go first.
      const unmounts = (await RuntimeTestObserver!.takeUnmountRecording())!;
      const [rootIndex, screenIndex, carrierIndex] = tags.map((tag) =>
        unmounts.findIndex(({ childTag }) => childTag === tag)
      );
      expect(rootIndex).toBe(0);
      expect(screenIndex > rootIndex && carrierIndex > rootIndex).toBe(true);
      expect(
        (await getTestComponent('stack-survivor').getMountedViewProps())?.height
      ).toBe(20, ComparisonMode.PIXEL);
    }
  );

  test('removes and reorders tagged list items without a screen change', async () => {
    await render(<TaggedList items={['first', 'middle', 'last']} />);
    await expectEventually(
      async () =>
        (await getTestComponent('list-middle').getMountedViewProps())?.width
    ).toBe(20, ComparisonMode.PIXEL);
    const firstTag = getTestComponent('list-first').getTag();
    const middleTag = getTestComponent('list-middle').getTag();
    const lastTag = getTestComponent('list-last').getTag();
    await render(<TaggedList items={['new', 'last', 'first']} />);
    await expectGone([middleTag]);
    expect(getTestComponent('list-first').getTag()).toBe(firstTag);
    expect(getTestComponent('list-last').getTag()).toBe(lastTag);
    for (const [name, y] of [
      ['new', 0],
      ['last', 20],
      ['first', 40],
    ] as const) {
      const props = await getTestComponent(
        `list-${name}`
      ).getMountedViewProps();
      expect(props?.y).toBe(y, ComparisonMode.PIXEL);
      expect(props?.opacity).toBe(1);
    }
    const newTag = getTestComponent('list-new').getTag();
    await render(<TaggedList items={['first']} />);
    await expectGone([newTag, lastTag]);
    expect(getTestComponent('list-first').getTag()).toBe(firstTag);
    expect(
      (await getTestComponent('list-first').getMountedViewProps())?.y
    ).toBe(0, ComparisonMode.PIXEL);
  });

  test('keeps a completed child exit inside a retained source', async () => {
    const childExit = FadeOut.duration(400);
    const tags = await startTransition('child', childExit);
    await render(
      <Screens active childRemoved exitKind="child" childExit={childExit} />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(200);
    const child = await readMounted(tags.child);
    expect(child !== null && child.opacity > 0 && child.opacity < 1).toBe(true);
    // The exit ends in a UI-thread pull before the JS-thread pull that retains the source.
    await render(
      <Screens
        active
        removed
        childRemoved
        exitKind="child"
        childExit={childExit}
        advanceBeforeCommit={300}
      />
    );
    await waitForFrames(3);
    // iOS removes the child when its exit ends. Android keeps it in the retained source.
    const exited = await readMounted(tags.child);
    expect(exited === null || exited.opacity === 0).toBe(true);
    expect(await isViewMountedNatively(tags.source)).toBe(true);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    // The removal moves the target up, so the run restarts with its full duration.
    await advanceAnimationTimer(1500);
    await expectGone([tags.source, tags.child]);
    await expectTargetRestored();
  });

  test('removes an unmatched source without retaining it', async () => {
    await render(<Screens active={false} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('child').getTag();
    await render(<Screens active={false} removed />);
    await expectGone([sourceTag, childTag]);
  });

  test('keeps a deleted source moving until it lands', async () => {
    const tags = await startTransition();
    await render(<Screens active removed />);
    await waitForFrames(3);
    const source = await readMounted(tags.source);
    expect(source === null).toBe(false);
    expect(source?.width).toBeWithinRange(65, 150.5);
    expect(await isViewMountedNatively(tags.child)).toBe(true);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await advanceAnimationTimer(500);
    const later = await readMounted(tags.source);
    expect(later === null).toBe(false);
    expect(later?.width).toBeWithinRange(65, 150.5);
    expect(
      later !== null && source !== null && later.width > source.width
    ).toBe(true);
    await advanceAnimationTimer(1000);
    await expectGone([tags.source, tags.child]);
    await expectTargetRestored();
    expect(await isViewMountedNatively(tags.parent)).toBe(true);
    expect((await getTestComponent('last').getMountedViewProps())?.height).toBe(
      20,
      ComparisonMode.PIXEL
    );
  });

  test.each([['parent'], ['source'], ['child']] as const)(
    'keeps the shared run when React deletes its ${0} with an exit',
    async ([exitKind]) => {
      const tags = await startTransition(exitKind);
      await render(<Screens active removed exitKind={exitKind} />);
      await waitForFrames(3);
      await advanceAnimationTimer(250);
      const source = await readMounted(tags.source);
      expect(source === null).toBe(false);
      expect(source?.opacity).toBeWithinRange(0.01, 1);
      expect((await readMounted(tags.child))?.width).toBe(
        20,
        ComparisonMode.PIXEL
      );
      if (exitKind === 'child') {
        expect((await readMounted(tags.child))?.opacity).toBe(1);
      }
      await advanceAnimationTimer(500);
      const later = await readMounted(tags.source);
      expect(
        later !== null && source !== null && later.width > source.width + 1
      ).toBe(true);
      await advanceAnimationTimer(750);
      await expectGone([tags.source, tags.child]);
      await expectTargetRestored();
      if (exitKind === 'parent') {
        await expectGone([tags.parent]);
      } else {
        expect(await isViewMountedNatively(tags.parent)).toBe(true);
      }
    }
  );

  test('removes siblings while the source is detached and another sibling exits', async () => {
    const tags = await startTransition();
    const firstTag = getTestComponent('first').getTag();
    const exitingTag = getTestComponent('exiting').getTag();
    const lastTag = getTestComponent('last').getTag();
    await render(<Screens active removeSiblings />);
    await expectGone([firstTag]);
    expect(await isViewMountedNatively(exitingTag)).toBe(true);
    await advanceAnimationTimer(500);
    await expectGone([exitingTag]);
    const moving = await readMounted(tags.source);
    expect(!!moving && moving.width > 65 && moving.width < 145).toBe(true);
    await advanceAnimationTimer(1000);
    await expectTargetRestored();
    expect(await isViewMountedNatively(lastTag)).toBe(true);
    const last = await getTestComponent('last').getMountedViewProps();
    expect(last?.y).toBe(60, ComparisonMode.PIXEL);
    expect(last?.height).toBe(20, ComparisonMode.PIXEL);
    expect((await readMounted(tags.source))?.opacity).toBe(0);
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 500 },
  source: { width: 60, height: 60, backgroundColor: '#dd5522' },
  target: {
    marginLeft: 60,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
  child: { width: 20, height: 15, backgroundColor: '#ffffff' },
  sibling: { width: 30, height: 20, backgroundColor: '#00aa00' },
});
