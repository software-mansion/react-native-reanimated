import { StyleSheet, View } from 'react-native';
import Animated, {
  LinearTransition,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import {
  describe,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const SOURCE_WIDTH = 60;
const TARGET_WIDTH = 150;
const CHILD_OPACITY = 0.8;
const CHILD_WIDTH = 20;
const WIDE_CHILD_WIDTH = 50;

const transition = SharedTransition.duration(3000).fadeContent();

function Endpoint({
  name,
  active,
  style,
}: {
  name: 'source' | 'target';
  active: boolean;
  style: object;
}) {
  const ref = useTestRef(name);
  const childRef = useTestRef(`${name}Child`);
  return (
    <SharedTransitionBoundary isActive={active}>
      <Animated.View
        ref={ref}
        sharedTransitionTag="fadeContent"
        sharedTransitionStyle={transition}
        style={style}>
        <View ref={childRef} collapsable={false} style={styles.child} />
      </Animated.View>
    </SharedTransitionBoundary>
  );
}

// Both endpoints stay mounted. The active boundary decides which view is on screen.
function Screens({
  showTarget,
  removeSource = false,
}: {
  showTarget: boolean;
  removeSource?: boolean;
}) {
  return (
    <View style={styles.container}>
      {!(showTarget && removeSource) && (
        <Endpoint name="source" active={!showTarget} style={styles.source} />
      )}
      <Endpoint name="target" active={showTarget} style={styles.target} />
    </View>
  );
}

// The child of the source changes its width in the update that starts the transition.
function ScreensWithAnimatedChild({ showTarget }: { showTarget: boolean }) {
  const ref = useTestRef('source');
  const childRef = useTestRef('sourceChild');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!showTarget}>
        <Animated.View
          ref={ref}
          sharedTransitionTag="fadeContent"
          sharedTransitionStyle={transition}
          style={styles.source}>
          <Animated.View
            ref={childRef}
            layout={LinearTransition.duration(3000)}
            style={[styles.child, showTarget && styles.wideChild]}
          />
        </Animated.View>
      </SharedTransitionBoundary>
      <Endpoint name="target" active={showTarget} style={styles.target} />
    </View>
  );
}

async function mountedProps(name: string) {
  return getTestComponent(name).getMountedViewProps();
}

function isBetween(value: number, min: number, max: number) {
  return value > min && value < max;
}

async function expectMovingWithChildOpacity(
  name: 'source' | 'target',
  min: number,
  max: number
) {
  await expectEventually(async () => {
    const [view, child] = await Promise.all([
      mountedProps(name),
      mountedProps(`${name}Child`),
    ]);
    return (
      !!view &&
      !!child &&
      isBetween(view.width, SOURCE_WIDTH + 5, TARGET_WIDTH - 5) &&
      view.opacity > 0.99 &&
      isBetween(child.opacity, min, max)
    );
  }).toBe(true);
}

async function expectOpacity(name: string, opacity: number) {
  await expectEventually(async () => {
    const props = await mountedProps(name);
    return !!props && Math.abs(props.opacity - opacity) < 0.01;
  }).toBe(true);
}

describe('Shared transition with fadeContent', () => {
  test('fades the children of the moving view out and keeps the view itself visible', async () => {
    await render(<Screens showTarget={false} />);
    await waitForFrames();

    await render(<Screens showTarget />);
    await expectMovingWithChildOpacity('source', 0.1, CHILD_OPACITY - 0.1);

    await expectOpacity('target', 1);
    await expectOpacity('targetChild', CHILD_OPACITY);
    await expectOpacity('source', 0);
    await expectOpacity('sourceChild', CHILD_OPACITY);
  });

  test('fades the children of the target in after the moving view lands', async () => {
    await render(<Screens showTarget={false} />);
    await waitForFrames();

    await render(<Screens showTarget />);
    await expectEventually(async () => {
      const [target, child] = await Promise.all([
        mountedProps('target'),
        mountedProps('targetChild'),
      ]);
      return (
        !!target &&
        !!child &&
        target.opacity > 0.99 &&
        isBetween(child.opacity, 0.05, CHILD_OPACITY - 0.05)
      );
    }).toBe(true);
    await expectOpacity('targetChild', CHILD_OPACITY);
  });

  test('fades the children back in when the navigation goes back during the move', async () => {
    await render(<Screens showTarget={false} />);
    await waitForFrames();

    await render(<Screens showTarget />);
    await expectMovingWithChildOpacity('source', 0.1, CHILD_OPACITY - 0.1);
    const beforeReturn = await mountedProps('sourceChild');

    await render(<Screens showTarget={false} />);
    await expectEventually(async () => {
      const child = await mountedProps('sourceChild');
      return (
        !!beforeReturn && !!child && child.opacity > beforeReturn.opacity + 0.05
      );
    }).toBe(true);

    await expectOpacity('source', 1);
    await expectOpacity('sourceChild', CHILD_OPACITY);
    await expectOpacity('target', 0);
  });

  test('keeps the layout animation of a child while it fades', async () => {
    await render(<ScreensWithAnimatedChild showTarget={false} />);
    await waitForFrames();

    await render(<ScreensWithAnimatedChild showTarget />);
    await expectEventually(async () => {
      const child = await mountedProps('sourceChild');
      return (
        !!child &&
        isBetween(child.width, CHILD_WIDTH + 5, WIDE_CHILD_WIDTH - 5) &&
        isBetween(child.opacity, 0.1, CHILD_OPACITY - 0.1)
      );
    }).toBe(true);

    await expectOpacity('targetChild', CHILD_OPACITY);
  });

  test('fades the children of the target in during the move when React removes the source', async () => {
    await render(<Screens showTarget={false} removeSource />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();

    await render(<Screens showTarget removeSource />);
    await expectMovingWithChildOpacity('target', 0.05, CHILD_OPACITY - 0.05);
    await expectEventually(() => isViewMountedNatively(sourceTag)).toBe(false);

    await expectOpacity('target', 1);
    await expectOpacity('targetChild', CHILD_OPACITY);
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
  child: {
    width: CHILD_WIDTH,
    height: 15,
    opacity: CHILD_OPACITY,
    backgroundColor: '#ffffff',
  },
  wideChild: {
    width: WIDE_CHILD_WIDTH,
  },
});
