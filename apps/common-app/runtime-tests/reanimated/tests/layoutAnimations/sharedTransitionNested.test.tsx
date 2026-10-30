import { StyleSheet, View } from 'react-native';
import Animated, {
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

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
import type { MountedViewProps } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

function transitionWithNotification(duration: number, name: string) {
  return SharedTransition.duration(duration).withCallback((finished) => {
    'worklet';
    if (finished) {
      notify(name);
    }
  });
}

type Transitions = { outer: SharedTransition; inner: SharedTransition };

const innerEndsFirst: Transitions = {
  outer: transitionWithNotification(8000, 'outer-finished'),
  inner: transitionWithNotification(2000, 'inner-finished'),
};

const outerEndsFirst: Transitions = {
  outer: transitionWithNotification(300, 'outer-finished'),
  inner: transitionWithNotification(3000, 'inner-finished'),
};

function Target({
  innerSize,
  innerColor,
  transitions,
}: {
  innerSize: number;
  innerColor: string;
  transitions: Transitions;
}) {
  const outer = useTestRef('targetOuter');
  const inner = useTestRef('targetInner');
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={outer}
        sharedTransitionTag="outer"
        sharedTransitionStyle={transitions.outer}
        style={styles.targetOuter}>
        <Animated.View
          ref={inner}
          sharedTransitionTag="inner"
          sharedTransitionStyle={transitions.inner}
          style={[
            styles.targetInner,
            {
              width: innerSize,
              height: innerSize,
              backgroundColor: innerColor,
            },
          ]}
        />
      </Animated.View>
    </SharedTransitionBoundary>
  );
}

function Screens({
  active,
  innerSize = 60,
  innerColor = '#ffffff',
  transitions = innerEndsFirst,
  removeSource = false,
}: {
  active: boolean;
  innerSize?: number;
  innerColor?: string;
  transitions?: Transitions;
  removeSource?: boolean;
}) {
  const inner = useTestRef('sourceInner');
  const outer = useTestRef('sourceOuter');
  return (
    <View style={styles.container}>
      {!(active && removeSource) && (
        <SharedTransitionBoundary isActive={!active}>
          <Animated.View
            ref={outer}
            sharedTransitionTag="outer"
            sharedTransitionStyle={transitions.outer}
            style={styles.sourceOuter}>
            <Animated.View
              ref={inner}
              sharedTransitionTag="inner"
              sharedTransitionStyle={transitions.inner}
              style={styles.sourceInner}
            />
          </Animated.View>
        </SharedTransitionBoundary>
      )}
      {active && (
        <Target
          innerSize={innerSize}
          innerColor={innerColor}
          transitions={transitions}
        />
      )}
    </View>
  );
}

async function sampleInnerViewWhileOuterTargetIsHidden() {
  let outerFinished = false;
  const markOuterFinished = () => {
    outerFinished = true;
  };
  const outerNotification = waitForNotification('outer-finished');
  outerNotification.then(markOuterFinished, markOuterFinished);
  const samples = { shown: 0, hidden: 0 };
  while (!outerFinished) {
    const [sourceInner, targetOuter] = await opacitiesOf(
      'sourceInner',
      'targetOuter'
    );
    if (targetOuter === 0) {
      samples[sourceInner === 1 ? 'shown' : 'hidden']++;
    }
    await waitForFrames(1);
  }
  await outerNotification;
  return samples;
}

async function sampleInnerViewUntilItLands() {
  let innerFinished = false;
  const markInnerFinished = () => {
    innerFinished = true;
  };
  const innerNotification = waitForNotification('inner-finished');
  innerNotification.then(markInnerFinished, markInnerFinished);
  const samples = { shown: 0, hidden: 0 };
  while (!innerFinished) {
    const [sourceInner, targetInner] = await opacitiesOf(
      'sourceInner',
      'targetInner'
    );
    if (targetInner === 0) {
      samples[sourceInner === 1 ? 'shown' : 'hidden']++;
    }
    await waitForFrames(1);
  }
  await innerNotification;
  return samples;
}

// Records a presented prop of the waiting inner view on each UI frame while the outer target is hidden.
function recordInnerViewProp<K extends 'width' | 'backgroundColor'>(prop: K) {
  const innerTag = getTestComponent('sourceInner').getTag();
  const outerTag = getTestComponent('targetOuter').getTag();
  const values = makeMutable<MountedViewProps[K][]>([]);
  const recording = makeMutable(true);
  scheduleOnUI(() => {
    'worklet';
    const record = () => {
      if (
        !recording.value ||
        global._obtainMountedViewProps(outerTag, false)?.opacity !== 0
      ) {
        return;
      }
      const value = global._obtainMountedViewProps(innerTag, true)?.[prop];
      if (value !== undefined) {
        values.modify((list) => {
          'worklet';
          list.push(value);
          return list;
        });
      }
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  return () => {
    recording.value = false;
    return values.value;
  };
}

async function expectInnerViewToReach<K extends 'width' | 'backgroundColor'>(
  prop: K,
  isEnd: (value: MountedViewProps[K]) => boolean
) {
  await expectEventually(async () => {
    const props = await getTestComponent('sourceInner').getPresentedViewProps();
    return (
      !!props && isEnd(props[prop]) && (await opacityOf('targetOuter')) === 0
    );
  }).toBe(true);
}

function opacitiesOf(...names: string[]) {
  const tags = names.map((name) => getTestComponent(name).getTag());
  return runOnUIBlocking(() => {
    'worklet';
    return tags.map(
      (tag) => global._obtainMountedViewProps(tag, false)?.opacity
    );
  });
}

async function expectAllShownAtTargets() {
  await expectEventually(async () => {
    return (
      (await opacityOf('targetOuter')) === 1 &&
      (await opacityOf('targetInner')) === 1 &&
      (await opacityOf('sourceInner')) === 0
    );
  }).toBe(true);
}

async function opacityOf(name: string) {
  return (await getTestComponent(name).getMountedViewProps())?.opacity;
}

describe('Nested shared transitions', () => {
  test('retargets a retained inner carrier while it waits to land', async () => {
    await render(<Screens active={false} removeSource />);
    await waitForFrames();
    const innerTag = getTestComponent('sourceInner').getTag();
    await render(<Screens active removeSource />);
    await waitForNotification('inner-finished');
    await waitForFrames(2);
    await render(<Screens active removeSource innerSize={90} />);
    await expectEventually(() =>
      runOnUIBlocking(() => {
        'worklet';
        const inner = global._obtainMountedViewProps(innerTag, false);
        return (
          !!inner && inner.width > 61 && inner.width < 89 && inner.opacity === 1
        );
      })
    ).toBe(true);
    await expectEventually(() =>
      runOnUIBlocking(() => {
        'worklet';
        const width = global._obtainMountedViewProps(innerTag, false)?.width;
        return width !== undefined && Math.abs(width - 90) < 0.5;
      })
    ).toBe(true);
    expect(await opacityOf('targetOuter')).toBe(0);
    await waitForNotification('outer-finished');
    await expectEventually(() => isViewMountedNatively(innerTag)).toBe(false);
    await expectEventually(() => opacityOf('targetInner')).toBe(1);
  });

  for (const [order, transitions] of [
    ['inner first', innerEndsFirst],
    ['outer first', outerEndsFirst],
  ] as const) {
    test(`keeps deleted nested carriers independent when they finish ${order}`, async () => {
      await render(
        <Screens active={false} transitions={transitions} removeSource />
      );
      await waitForFrames();
      const innerTag = getTestComponent('sourceInner').getTag();
      const outerTag = getTestComponent('sourceOuter').getTag();
      await render(<Screens active transitions={transitions} removeSource />);
      await waitForNotification(
        order === 'inner first' ? 'inner-finished' : 'outer-finished'
      );
      await waitForFrames(2);
      expect(await isViewMountedNatively(innerTag)).toBe(true);
      expect(
        await runOnUIBlocking(() => {
          'worklet';
          return global._obtainMountedViewProps(innerTag, false)?.opacity;
        })
      ).toBe(1);
      if (order === 'outer first') {
        await expectEventually(() => isViewMountedNatively(outerTag)).toBe(
          false
        );
      } else {
        expect(await isViewMountedNatively(outerTag)).toBe(true);
      }
      await waitForNotification(
        order === 'inner first' ? 'outer-finished' : 'inner-finished'
      );
      await expectEventually(() => isViewMountedNatively(innerTag)).toBe(false);
      await expectEventually(() => isViewMountedNatively(outerTag)).toBe(false);
      await expectEventually(() => opacityOf('targetInner')).toBe(1);
      await expectEventually(() => opacityOf('targetOuter')).toBe(1);
    });
  }

  test('keeps the inner view on screen until the outer transition ends', async () => {
    await render(<Screens active={false} />);
    await waitForFrames();

    await render(<Screens active />);
    await waitForNotification('inner-finished');
    const samples = await sampleInnerViewWhileOuterTargetIsHidden();
    expect(samples.hidden).toBe(0);
    expect(samples.shown > 0).toBe(true);

    await expectAllShownAtTargets();
  });

  test('moves the waiting inner view when its target changes', async () => {
    await render(<Screens active={false} />);
    await waitForFrames();

    await render(<Screens active />);
    await waitForNotification('inner-finished');
    await waitForFrames(2);
    const stopRecording = recordInnerViewProp('width');
    await render(<Screens active innerSize={90} />);
    await expectInnerViewToReach(
      'width',
      (width) => Math.abs(width - 90) < 0.5
    );
    const widths = stopRecording();
    expect(widths.some((width) => width > 61 && width < 89)).toBe(true);
    expect(await opacityOf('sourceInner')).toBe(1);

    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('animates the waiting inner view to a new color of its target', async () => {
    await mockAnimationTimer(false);
    await render(<Screens active={false} />);
    await waitForFrames();

    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(2000);
    await waitForNotification('inner-finished');
    await waitForFrames(2);
    const oldColor = (
      await getTestComponent('sourceInner').getPresentedViewProps()
    )?.backgroundColor;
    const stopRecording = recordInnerViewProp('backgroundColor');
    await render(<Screens active innerColor="#00ff00" />);
    await waitForFrames(3);
    await advanceAnimationTimer(1000);
    const newColor = (
      await getTestComponent('targetInner').getMountedViewProps()
    )?.backgroundColor;
    const colors = stopRecording();
    expect(
      colors.some((color) => color !== oldColor && color !== newColor)
    ).toBe(true);
    await advanceAnimationTimer(1000);
    await expectInnerViewToReach(
      'backgroundColor',
      (color) => color === newColor
    );
    await advanceAnimationTimer(4000);
    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('keeps the inner view on screen when the outer transition ends first', async () => {
    await render(<Screens active={false} transitions={outerEndsFirst} />);
    await waitForFrames();

    await render(<Screens active transitions={outerEndsFirst} />);
    await waitForNotification('outer-finished');
    const samples = await sampleInnerViewUntilItLands();
    expect(samples.hidden).toBe(0);
    expect(samples.shown > 0).toBe(true);

    await expectAllShownAtTargets();
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  sourceOuter: { width: 80, height: 80, backgroundColor: '#dd5522' },
  sourceInner: { width: 30, height: 30, backgroundColor: '#ffffff' },
  targetOuter: {
    marginTop: 100,
    marginLeft: 60,
    width: 200,
    height: 200,
    backgroundColor: '#2277dd',
  },
  targetInner: { marginTop: 40, marginLeft: 40, backgroundColor: '#ffffff' },
});
