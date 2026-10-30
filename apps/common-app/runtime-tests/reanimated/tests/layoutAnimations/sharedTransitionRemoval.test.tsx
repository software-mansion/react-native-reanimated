import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

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
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const transition = SharedTransition.duration(1500);
const exit = FadeOut.duration(1500);

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
}: {
  active: boolean;
  removed?: boolean;
  exitKind?: ExitKind;
  removeSiblings?: boolean;
  childRemoved?: boolean;
  childExit?: FadeOut;
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
                exiting={exit}
                style={styles.sibling}
              />
            )}
            <View ref={last} collapsable={false} style={styles.sibling} />
          </SharedTransitionBoundary>
        </Animated.View>
      )}
      {active && <Target />}
    </View>
  );
}

function readMounted(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false);
  });
}

async function startTransition(exitKind: ExitKind = 'none', childExit = exit) {
  await mockAnimationTimer(false);
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
    await render(
      <Screens
        active
        removed
        childRemoved
        exitKind="child"
        childExit={childExit}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    expect((await readMounted(tags.child))?.opacity).toBe(0);
    expect(await isViewMountedNatively(tags.source)).toBe(true);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await advanceAnimationTimer(1200);
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
      await advanceAnimationTimer(1250);
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
    await advanceAnimationTimer(1500);
    await expectGone([exitingTag]);
    await expectTargetRestored();
    expect(getTestComponent('last').getTag()).toBe(lastTag);
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
