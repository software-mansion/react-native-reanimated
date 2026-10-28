import { StyleSheet, View } from 'react-native';
import type { SharedTransitionCrossfadeWindow } from 'react-native-reanimated';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const SOURCE_WIDTH = 60;
const TARGET_WIDTH = 150;

function createTransition(
  finished: boolean[],
  {
    duration = 2000,
    window,
  }: { duration?: number; window?: SharedTransitionCrossfadeWindow } = {}
) {
  const recordEnd = (isFinished: boolean) => {
    finished.push(isFinished);
    notify('crossfade-finished');
  };
  return SharedTransition.duration(duration)
    .crossfade(window)
    .withCallback((isFinished) => {
      'worklet';
      scheduleOnRN(recordEnd, isFinished);
    });
}

function Endpoint({
  name,
  active,
  transition,
  style,
  mounted = true,
}: {
  name: 'source' | 'target';
  active: boolean;
  transition: SharedTransition;
  style: object;
  mounted?: boolean;
}) {
  const ref = useTestRef(name);
  const childRef = useTestRef(`${name}Child`);
  return (
    <SharedTransitionBoundary isActive={active}>
      {mounted && (
        <Animated.View
          ref={ref}
          sharedTransitionTag="crossfade"
          sharedTransitionStyle={transition}
          style={style}>
          <View ref={childRef} collapsable={false} style={styles.child} />
        </Animated.View>
      )}
    </SharedTransitionBoundary>
  );
}

// Both endpoints stay mounted. The active boundary decides which view is on screen.
function Screens({
  showTarget,
  transition,
  removeSource = false,
  removeTarget = false,
  targetViewMounted = true,
}: {
  showTarget: boolean;
  transition: SharedTransition;
  removeSource?: boolean;
  removeTarget?: boolean;
  targetViewMounted?: boolean;
}) {
  return (
    <View style={styles.container}>
      {!(showTarget && removeSource) && (
        <Endpoint
          name="source"
          active={!showTarget}
          transition={transition}
          style={styles.source}
        />
      )}
      {!(!showTarget && removeTarget) && (
        <Endpoint
          name="target"
          active={showTarget}
          transition={transition}
          style={styles.target}
          mounted={targetViewMounted}
        />
      )}
    </View>
  );
}

async function mountedProps(name: string) {
  return getTestComponent(name).getMountedViewProps();
}

function isBetween(value: number, min: number, max: number) {
  return value > min && value < max;
}

// Both views are read at once, because a read can take a frame or more.
async function mountedEndpoints() {
  const [source, target] = await Promise.all([
    mountedProps('source'),
    mountedProps('target'),
  ]);
  return source && target ? { source, target } : undefined;
}

async function expectCrossfadeInProgress() {
  await expectEventually(async () => {
    const endpoints = await mountedEndpoints();
    return (
      !!endpoints &&
      isBetween(endpoints.source.width, SOURCE_WIDTH + 5, TARGET_WIDTH - 5) &&
      Math.abs(endpoints.source.width - endpoints.target.width) < 1 &&
      isBetween(endpoints.source.opacity, 0.05, 0.95) &&
      isBetween(endpoints.target.opacity, 0.05, 0.95)
    );
  }).toBe(true);
}

async function expectAtHome(name: string, width: number, opacity: number) {
  await expectEventually(async () => {
    const props = await mountedProps(name);
    return (
      !!props &&
      Math.abs(props.width - width) < 0.5 &&
      Math.abs(props.opacity - opacity) < 0.01
    );
  }).toBe(true);
}

describe('Shared transition with crossfade', () => {
  test('moves both views in one frame, fades the source out and the target in', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(finished);
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();
    const sourceChildTag = getTestComponent('sourceChild').getTag();
    const targetChildTag = getTestComponent('targetChild').getTag();

    await render(<Screens showTarget transition={transition} />);
    await expectCrossfadeInProgress();
    expect(getTestComponent('sourceChild').getTag()).toBe(sourceChildTag);
    expect(getTestComponent('targetChild').getTag()).toBe(targetChildTag);

    await waitForNotification('crossfade-finished');
    await expectAtHome('source', SOURCE_WIDTH, 0);
    await expectAtHome('target', TARGET_WIDTH, 1);
    await waitForFrames(10);
    expect(finished.length).toBe(1);
    expect(finished[0]).toBe(true);
  });

  test('fades back when the navigation goes back during the transition', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(finished);
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await expectCrossfadeInProgress();
    const beforeReversal = await mountedEndpoints();

    await render(<Screens showTarget={false} transition={transition} />);
    const afterReversal = await mountedEndpoints();
    expect(
      !!beforeReversal &&
        !!afterReversal &&
        Math.abs(afterReversal.target.opacity - beforeReversal.target.opacity) <
          0.35
    ).toBe(true);
    await expectEventually(async () => {
      const endpoints = await mountedEndpoints();
      return (
        !!endpoints &&
        !!afterReversal &&
        endpoints.target.opacity < afterReversal.target.opacity - 0.05 &&
        endpoints.source.opacity > afterReversal.source.opacity + 0.05
      );
    }).toBe(true);

    await expectAtHome('source', SOURCE_WIDTH, 1);
    await expectAtHome('target', TARGET_WIDTH, 0);
  });

  test('keeps the source on screen when the navigation goes back and React removes the target', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(finished, { duration: 4000 });
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    const targetTag = getTestComponent('target').getTag();
    // Early in the fade the source is still mostly visible and the target mostly transparent.
    await expectEventually(async () => {
      const source = await mountedProps('source');
      return !!source && isBetween(source.opacity, 0.75, 0.95);
    }).toBe(true);
    const beforeReturn = await mountedProps('source');

    await render(
      <Screens showTarget={false} transition={transition} removeTarget />
    );
    const afterReturn = await mountedProps('source');
    expect(
      !!beforeReturn &&
        !!afterReturn &&
        afterReturn.opacity > beforeReturn.opacity - 0.35
    ).toBe(true);

    await expectAtHome('source', SOURCE_WIDTH, 1);
    await expectEventually(() => isViewMountedNatively(targetTag)).toBe(false);
  });

  // React removes the target view while its screen stays on top, and the navigation goes back before the run ends.
  for (const [mode, transition] of [
    ['a crossfade', SharedTransition.duration(4000).crossfade()],
    ['a transition without crossfade', SharedTransition.duration(4000)],
  ] as const) {
    test(`shows the source at the end of ${mode} whose target React removed`, async () => {
      await render(<Screens showTarget={false} transition={transition} />);
      await waitForFrames();
      const sourceTag = getTestComponent('source').getTag();

      await render(<Screens showTarget transition={transition} />);
      await expectEventually(async () => {
        const source = await mountedProps('source');
        return (
          !!source &&
          isBetween(source.width, SOURCE_WIDTH + 5, TARGET_WIDTH - 5)
        );
      }).toBe(true);

      await render(
        <Screens showTarget transition={transition} targetViewMounted={false} />
      );
      await waitForFrames();
      await render(
        <Screens
          showTarget={false}
          transition={transition}
          targetViewMounted={false}
        />
      );

      await expectAtHome('source', SOURCE_WIDTH, 1);
      expect(getTestComponent('source').getTag()).toBe(sourceTag);
    });
  }

  test('ends the fade at the end of its window while the views still move', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(finished, { window: { end: 0.25 } });
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await expectEventually(async () => {
      const endpoints = await mountedEndpoints();
      return (
        !!endpoints &&
        isBetween(
          endpoints.source.width,
          SOURCE_WIDTH + 30,
          TARGET_WIDTH - 15
        ) &&
        endpoints.source.opacity < 0.01 &&
        endpoints.target.opacity > 0.99
      );
    }).toBe(true);

    await waitForNotification('crossfade-finished');
    await expectAtHome('target', TARGET_WIDTH, 1);
  });

  test('moves only the target when React removes the source in the same update', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(finished);
    await render(
      <Screens showTarget={false} transition={transition} removeSource />
    );
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();

    await render(<Screens showTarget transition={transition} removeSource />);
    await expectEventually(async () => {
      const props = await mountedProps('target');
      return (
        !!props &&
        isBetween(props.width, SOURCE_WIDTH + 5, TARGET_WIDTH - 5) &&
        props.opacity > 0.99
      );
    }).toBe(true);
    await expectEventually(() => isViewMountedNatively(sourceTag)).toBe(false);

    await waitForNotification('crossfade-finished');
    await expectAtHome('target', TARGET_WIDTH, 1);
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  source: {
    width: SOURCE_WIDTH,
    height: 60,
    backgroundColor: '#dd5522',
  },
  target: {
    position: 'absolute',
    top: 100,
    left: 60,
    width: TARGET_WIDTH,
    height: 150,
    backgroundColor: '#2277dd',
  },
  child: { width: 20, height: 15, backgroundColor: '#ffffff' },
});
