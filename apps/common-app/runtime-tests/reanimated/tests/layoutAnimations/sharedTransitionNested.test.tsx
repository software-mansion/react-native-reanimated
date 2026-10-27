import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

function transitionWithNotification(duration: number, name: string) {
  return SharedTransition.duration(duration).withCallback((finished) => {
    'worklet';
    if (finished) {
      notify(name);
    }
  });
}

const outerTransition = transitionWithNotification(6000, 'outer-finished');
const innerTransition = transitionWithNotification(300, 'inner-finished');

function Target({ innerSize }: { innerSize: number }) {
  const outer = useTestRef('targetOuter');
  const inner = useTestRef('targetInner');
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={outer}
        sharedTransitionTag="outer"
        sharedTransitionStyle={outerTransition}
        style={styles.targetOuter}>
        <Animated.View
          ref={inner}
          sharedTransitionTag="inner"
          sharedTransitionStyle={innerTransition}
          style={[styles.targetInner, { width: innerSize, height: innerSize }]}
        />
      </Animated.View>
    </SharedTransitionBoundary>
  );
}

function Screens({
  active,
  innerSize = 60,
}: {
  active: boolean;
  innerSize?: number;
}) {
  const inner = useTestRef('sourceInner');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          sharedTransitionTag="outer"
          sharedTransitionStyle={outerTransition}
          style={styles.sourceOuter}>
          <Animated.View
            ref={inner}
            sharedTransitionTag="inner"
            sharedTransitionStyle={innerTransition}
            style={styles.sourceInner}
          />
        </Animated.View>
      </SharedTransitionBoundary>
      {active && <Target innerSize={innerSize} />}
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
    await render(<Screens active innerSize={90} />);
    await expectEventually(async () => {
      const props = await getTestComponent('sourceInner').getMountedViewProps();
      const targetOuter = await opacityOf('targetOuter');
      return (
        !!props &&
        Math.abs(props.width - 90) < 0.5 &&
        props.opacity === 1 &&
        targetOuter === 0
      );
    }).toBe(true);

    await waitForNotification('outer-finished');
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
