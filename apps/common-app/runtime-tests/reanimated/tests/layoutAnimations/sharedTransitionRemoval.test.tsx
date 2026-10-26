import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

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
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const transition = SharedTransition.duration(1500);
const exit = FadeOut.duration(1500);

type ExitKind = 'none' | 'parent' | 'source';

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
}: {
  active: boolean;
  removed?: boolean;
  exitKind?: ExitKind;
  removeSiblings?: boolean;
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
                <View ref={child} collapsable={false} style={styles.child} />
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

async function startTransition(exitKind: ExitKind = 'none') {
  await render(<Screens active={false} exitKind={exitKind} />);
  await waitForFrames();
  const tags = {
    source: getTestComponent('source').getTag(),
    child: getTestComponent('child').getTag(),
    parent: getTestComponent('parent').getTag(),
  };
  await render(<Screens active exitKind={exitKind} />);
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

describe('Removal during a shared transition', () => {
  test('deletes a moving source and its children without an exit', async () => {
    const tags = await startTransition();
    await render(<Screens active removed />);
    await expectGone([tags.source, tags.child]);
    await expectTargetRestored();
    expect(await isViewMountedNatively(tags.parent)).toBe(true);
    expect((await getTestComponent('last').getMountedViewProps())?.height).toBe(
      20,
      ComparisonMode.PIXEL
    );
  });

  test.each([['parent'], ['source']] as const)(
    'keeps a removed source visible while its ${0} exits, then removes it',
    async ([exitKind]) => {
      const tags = await startTransition(exitKind);
      await render(<Screens active removed exitKind={exitKind} />);
      await waitForFrames(3);
      const source = await readMounted(tags.source);
      expect(source === null).toBe(false);
      expect(source?.opacity).toBeWithinRange(0.01, 1);
      expect((await readMounted(tags.child))?.width).toBe(
        20,
        ComparisonMode.PIXEL
      );
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
