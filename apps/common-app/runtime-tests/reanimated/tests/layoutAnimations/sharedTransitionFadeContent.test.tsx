import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  advanceAnimationTimer,
  beforeEach,
  callTracker,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  getTrackerCallCount,
  isViewMountedNatively,
  mockAnimationTimer,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import type { MountedViewProps } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const SOURCE_WIDTH = 60;
const TARGET_WIDTH = 150;
const CHILD_OPACITY = 0.8;
const CHILD_WIDTH = 20;
const WIDE_CHILD_WIDTH = 50;

const transition = SharedTransition.duration(3000).fadeContent();
const linearFade = SharedTransition.duration(3000)
  .easing(Easing.linear)
  .fadeContent();
const linearNoFade = SharedTransition.duration(3000).easing(Easing.linear);

function Endpoint({
  name,
  active,
  style,
  hiddenChild = false,
  sharedTransition = transition,
  siblings,
}: {
  name: 'source' | 'target';
  active: boolean;
  style: object;
  hiddenChild?: boolean;
  sharedTransition?: SharedTransition;
  siblings?: boolean;
}) {
  const ref = useTestRef(name);
  const childRef = useTestRef(`${name}Child`);
  const view = (
    <Animated.View
      key="endpoint"
      ref={ref}
      sharedTransitionTag="fadeContent"
      sharedTransitionStyle={sharedTransition}
      style={style}>
      <View ref={childRef} collapsable={false} style={styles.child} />
      {hiddenChild && <HiddenChild name={`${name}HiddenChild`} />}
    </Animated.View>
  );
  const siblingViews = ['sibling-1', 'sibling-2'].map((key) => (
    <View key={key} collapsable={false} style={styles.child} />
  ));
  return (
    <SharedTransitionBoundary isActive={active}>
      {siblings ? [...siblingViews, view] : view}
    </SharedTransitionBoundary>
  );
}

function HiddenChild({ name }: { name: string }) {
  const ref = useTestRef(name);
  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.child, { opacity: 0 }]}
    />
  );
}

// Both endpoints stay mounted. The active boundary decides which view is on screen.
function Screens({
  showTarget,
  removeSource = false,
  hiddenTargetChild = false,
  sharedTransition = transition,
}: {
  showTarget: boolean;
  removeSource?: boolean;
  hiddenTargetChild?: boolean;
  sharedTransition?: SharedTransition;
}) {
  return (
    <View style={styles.container}>
      {!(showTarget && removeSource) && (
        <Endpoint
          name="source"
          active={!showTarget}
          style={styles.source}
          sharedTransition={sharedTransition}
        />
      )}
      <Endpoint
        name="target"
        active={showTarget}
        style={styles.target}
        hiddenChild={hiddenTargetChild}
        sharedTransition={sharedTransition}
      />
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

const outerMove = SharedTransition.duration(3000);
const innerFade = SharedTransition.duration(600).fadeContent();

// The inner pair lands while the outer target is still hidden.
function NestedScreens({ showTarget }: { showTarget: boolean }) {
  const outerTarget = useTestRef('nestedOuterTarget');
  const innerTarget = useTestRef('nestedInnerTarget');
  const innerTargetChild = useTestRef('nestedInnerTargetChild');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!showTarget}>
        <Animated.View
          sharedTransitionTag="nestedFadeOuter"
          sharedTransitionStyle={outerMove}
          style={styles.nestedOuterSource}>
          <Animated.View
            sharedTransitionTag="nestedFadeInner"
            sharedTransitionStyle={innerFade}
            style={styles.source}>
            <View collapsable={false} style={styles.child} />
          </Animated.View>
        </Animated.View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={showTarget}>
        <Animated.View
          ref={outerTarget}
          sharedTransitionTag="nestedFadeOuter"
          sharedTransitionStyle={outerMove}
          style={styles.target}>
          <Animated.View
            ref={innerTarget}
            sharedTransitionTag="nestedFadeInner"
            sharedTransitionStyle={innerFade}
            style={styles.nestedInnerTarget}>
            <View
              ref={innerTargetChild}
              collapsable={false}
              style={styles.child}
            />
          </Animated.View>
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

const ENTERING_FINISHED = 'fade-content-entering-finished';
const ENTERING_CANCELLED = 'fade-content-entering-cancelled';

const childEntering = FadeIn.duration(300).withCallback((finished) => {
  'worklet';
  callTracker(finished ? ENTERING_FINISHED : ENTERING_CANCELLED);
});

const longExiting = FadeOut.duration(6000);
const LAYOUT_FINISHED = 'fade-content-layout-finished';
const LAYOUT_CANCELLED = 'fade-content-layout-cancelled';

const longLayout = LinearTransition.duration(10000).withCallback((finished) => {
  'worklet';
  callTracker(finished ? LAYOUT_FINISHED : LAYOUT_CANCELLED);
});

function EnteringChild({
  exits,
  wide,
  tagged,
}: {
  exits: boolean;
  wide: boolean;
  tagged: boolean;
}) {
  const ref = useTestRef('enteringChild');
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag={tagged ? 'unmatched-entering-child' : undefined}
      entering={childEntering}
      exiting={exits ? longExiting : undefined}
      layout={longLayout}
      style={[styles.enteringChild, wide && styles.wideChild]}
    />
  );
}

// The target mounts a child with an entering animation in the update that starts the transition.
function ScreensWithEnteringChild({
  showTarget,
  showChild = true,
  childExits = false,
  childWide = false,
  childTagged = false,
  keepChild = false,
}: {
  showTarget: boolean;
  showChild?: boolean;
  childExits?: boolean;
  childWide?: boolean;
  childTagged?: boolean;
  keepChild?: boolean;
}) {
  const ref = useTestRef('target');
  return (
    <View style={styles.container}>
      <Endpoint
        name="source"
        active={!showTarget}
        style={styles.source}
        siblings
      />
      <SharedTransitionBoundary isActive={showTarget}>
        <Animated.View
          ref={ref}
          sharedTransitionTag="fadeContent"
          sharedTransitionStyle={transition}
          style={styles.target}>
          {(showTarget || keepChild) && showChild && (
            <EnteringChild
              exits={childExits}
              wide={childWide}
              tagged={childTagged}
            />
          )}
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

async function expectEnteringCallbacks(finished: number) {
  await expectEventually(() =>
    getTrackerCallCount(ENTERING_FINISHED)
  ).toBeCalledUI(finished);
  expect(await getTrackerCallCount(ENTERING_CANCELLED)).toBeCalledUI(0);
}

// Children with an animated opacity, a layout animation and an exit.
function ChildrenPair({
  active,
  sourceConfig = linearFade,
  targetConfig = linearFade,
  tagged = false,
  insert = false,
  remove = false,
  targetWide = false,
  childOpacity,
}: {
  active: boolean;
  sourceConfig?: SharedTransition;
  targetConfig?: SharedTransition;
  tagged?: boolean;
  insert?: boolean;
  remove?: boolean;
  targetWide?: boolean;
  childOpacity?: SharedValue<number>;
}) {
  const source = useTestRef('source');
  const target = useTestRef('target');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="fadeContentChildren"
          sharedTransitionStyle={sourceConfig}
          style={styles.source}>
          {!remove && (
            <Child name="child" tagged={tagged} opacity={childOpacity} />
          )}
          <Child name="reference" />
          {insert && <Child name="inserted" />}
        </Animated.View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <Animated.View
          ref={target}
          sharedTransitionTag="fadeContentChildren"
          sharedTransitionStyle={targetConfig}
          style={styles.target}>
          <Child name="targetChild" wide={targetWide} />
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

function Child({
  name,
  tagged = false,
  wide = false,
  opacity,
}: {
  name: string;
  tagged?: boolean;
  wide?: boolean;
  opacity?: SharedValue<number>;
}) {
  const ref = useTestRef(name);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity?.value ?? CHILD_OPACITY,
  }));
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag={tagged ? 'unmatched-child' : undefined}
      layout={LinearTransition.duration(6000)}
      exiting={FadeOut.duration(6000)}
      style={[styles.child, wide && styles.wideChild, animatedStyle]}
    />
  );
}

// A tag stays readable after React unmounts the view.
let tags: Record<string, number> = {};

function tagOf(name: string) {
  const tag = getTestComponent(name).getTag();
  if (tag > 0) {
    tags[name] = tag;
  }
  return tags[name] ?? -1;
}

// Reads the views in one UI frame.
function sample(names: string[]) {
  const viewTags = names.map(tagOf);
  return runOnUIBlocking(() => {
    'worklet';
    return viewTags.map((tag) => global._obtainMountedViewProps(tag, false));
  });
}

async function mountedProps(name: string) {
  const [view] = await sample([name]);
  return view;
}

function isBetween(value: number, min: number, max: number) {
  return value > min && value < max;
}

type ViewSample = Pick<MountedViewProps, 'width' | 'opacity'>;

function isMoving<View extends ViewSample>(view: View | null): view is View {
  return (
    !!view &&
    isBetween(view.width, SOURCE_WIDTH + 5, TARGET_WIDTH - 5) &&
    view.opacity > 0.99
  );
}

async function expectMovingWithChildOpacity(
  name: 'source' | 'target',
  min: number,
  max: number
) {
  await expectEventually(async () => {
    const [view, child] = await sample([name, `${name}Child`]);
    return isMoving(view) && !!child && isBetween(child.opacity, min, max);
  }).toBe(true);
}

async function expectOpacity(name: string, opacity: number) {
  await expectEventually(async () => {
    const props = await mountedProps(name);
    return !!props && Math.abs(props.opacity - opacity) < 0.01;
  }).toBe(true);
}

// The children fade with the moving view, so they keep the opacity of the reference child.
async function expectFadingLikeReference(name: string) {
  await expectEventually(async () => {
    const [source, child, reference] = await sample([
      'source',
      name,
      'reference',
    ]);
    return (
      isMoving(source) &&
      !!child &&
      !!reference &&
      isBetween(child.opacity, 0.02, CHILD_OPACITY - 0.05) &&
      Math.abs(child.opacity - reference.opacity) < 0.02
    );
  }).toBe(true);
}

describe('Shared transition with fadeContent', () => {
  beforeEach(() => {
    tags = {};
  });

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
    await render(<Screens showTarget={false} hiddenTargetChild />);
    await waitForFrames();

    await render(<Screens showTarget hiddenTargetChild />);
    await expectEventually(async () => {
      const [target, child] = await sample(['target', 'targetChild']);
      return (
        !!target &&
        !!child &&
        target.opacity > 0.99 &&
        isBetween(child.opacity, 0.05, CHILD_OPACITY - 0.05)
      );
    }).toBe(true);
    await expectOpacity('targetChild', CHILD_OPACITY);
    for (let frame = 0; frame < 10; frame++) {
      expect((await mountedProps('targetHiddenChild'))?.opacity).toBe(0);
      await waitForFrames(1);
    }
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

  test.each([false, true])(
    'plays the entering animation of a target child when the moving view lands (unmatched tag: %p)',
    async (childTagged) => {
      await render(
        <ScreensWithEnteringChild
          showTarget={false}
          childTagged={childTagged}
        />
      );
      await waitForFrames();

      await render(
        <ScreensWithEnteringChild showTarget childTagged={childTagged} />
      );
      const frames = await recordFrames(
        ['source', 'enteringChild'],
        async () => {
          await expectMovingWithChildOpacity(
            'source',
            0.1,
            CHILD_OPACITY - 0.1
          );
          expect(await getTrackerCallCount(ENTERING_FINISHED)).toBeCalledUI(0);
          await expectOpacity('enteringChild', 1);
        }
      );
      const moving = frames.filter(
        ([source, child]) => isMoving(source) && !!child
      );
      expect(moving.length > 0).toBe(true);
      expect(moving.every(([, child]) => child!.opacity < 0.01)).toBe(true);
      await expectEnteringCallbacks(1);
    }
  );

  test('plays the entering animation of a target child when the navigation goes back during the move', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<ScreensWithEnteringChild showTarget={false} />);
    await waitForFrames();

    await render(<ScreensWithEnteringChild showTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(1500);
    await expectMovingWithChildOpacity('source', 0.1, CHILD_OPACITY - 0.1);
    const held = await mountedProps('enteringChild');
    expect(!!held && held.opacity < 0.01).toBe(true);
    expect(await getTrackerCallCount(ENTERING_FINISHED)).toBeCalledUI(0);
    await render(<ScreensWithEnteringChild showTarget={false} keepChild />);
    await waitForFrames(3);

    // The reversed run needs much more than 300 ms, so only the end of the target role starts the entering animation.
    await advanceAnimationTimer(300);
    await expectOpacity('enteringChild', 1);
    await expectEnteringCallbacks(1);
    await expectMovingWithChildOpacity('source', 0.1, 1);
  });

  test('drops a queued layout change of a target child when the navigation goes back', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<ScreensWithEnteringChild showTarget={false} />);
    await waitForFrames();

    await render(<ScreensWithEnteringChild showTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(1500);
    await expectMovingWithChildOpacity('source', 0.1, CHILD_OPACITY - 0.1);
    // The layout change and the end of the target role are in one update, so the layout animation does not start.
    await render(
      <ScreensWithEnteringChild showTarget={false} keepChild childWide />
    );
    await waitForFrames(3);

    await advanceAnimationTimer(300);
    await expectEventually(async () => {
      const child = await mountedProps('enteringChild');
      return (
        !!child &&
        child.opacity > 0.99 &&
        Math.abs(child.width - WIDE_CHILD_WIDTH) < 0.5
      );
    }).toBe(true);
    await expectEnteringCallbacks(1);
    await advanceAnimationTimer(500);
    await waitForFrames(3);
    expect(await getTrackerCallCount(LAYOUT_CANCELLED)).toBeCalledUI(0);
    expect(await getTrackerCallCount(LAYOUT_FINISHED)).toBeCalledUI(0);
  });

  test('replaces the layout animation of a target child with its entering animation', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<ScreensWithEnteringChild showTarget={false} />);
    await waitForFrames();

    await render(<ScreensWithEnteringChild showTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(1500);
    await expectMovingWithChildOpacity('source', 0.1, CHILD_OPACITY - 0.1);
    await render(<ScreensWithEnteringChild showTarget childWide />);
    await waitForFrames(3);

    // The layout animation of the child takes 10 seconds, the entering animation 300 ms.
    await advanceAnimationTimer(1500);
    await expectOpacity('target', 1);
    await advanceAnimationTimer(300);
    await expectEventually(async () => {
      const child = await mountedProps('enteringChild');
      return (
        !!child &&
        child.opacity > 0.99 &&
        Math.abs(child.width - WIDE_CHILD_WIDTH) < 0.5
      );
    }).toBe(true);
    await expectEnteringCallbacks(1);
    // The running layout animation stops with `finished` set to false.
    await expectEventually(() =>
      getTrackerCallCount(LAYOUT_CANCELLED)
    ).toBeCalledUI(1);
    expect(await getTrackerCallCount(LAYOUT_FINISHED)).toBeCalledUI(0);
  });

  test('keeps hidden a target child that React removes while its entering animation waits', async () => {
    await render(<ScreensWithEnteringChild showTarget={false} childExits />);
    await waitForFrames();

    await render(<ScreensWithEnteringChild showTarget childExits />);
    await expectMovingWithChildOpacity('source', 0.1, CHILD_OPACITY - 0.1);
    const childTag = tagOf('enteringChild');
    const frames = await recordFrames(['enteringChild'], async () => {
      await render(
        <ScreensWithEnteringChild showTarget showChild={false} childExits />
      );
      await expectOpacity('target', 1);
      await expectEventually(() => isViewMountedNatively(childTag), 10000).toBe(
        false
      );
    });
    const mounted = frames.filter(([child]) => !!child);
    expect(mounted.length > 0).toBe(true);
    expect(mounted.every(([child]) => child!.opacity < 0.01)).toBe(true);
    expect(await getTrackerCallCount(ENTERING_FINISHED)).toBeCalledUI(0);
    expect(await getTrackerCallCount(ENTERING_CANCELLED)).toBeCalledUI(0);
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

  test('keeps the content fade of a view that stays mounted after an unmount releases its pair', async () => {
    await render(<Screens showTarget={false} removeSource />);
    await waitForFrames();
    await render(<Screens showTarget removeSource />);
    await expectOpacity('target', 1);
    await expectOpacity('targetChild', CHILD_OPACITY);

    await render(<Screens showTarget={false} removeSource />);
    await expectMovingWithChildOpacity('target', 0.05, CHILD_OPACITY - 0.05);
    await expectOpacity('source', 1);
    await expectOpacity('sourceChild', CHILD_OPACITY);
  });

  test('fades an unmatched tagged direct child', async () => {
    await render(<ChildrenPair active={false} tagged />);
    await waitForFrames();
    await render(<ChildrenPair active tagged />);
    await expectFadingLikeReference('child');
    await expectOpacity('target', 1);
    await expectOpacity('child', CHILD_OPACITY);
  });

  test('fades a child whose own opacity changes during the move', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const childOpacity = makeMutable(CHILD_OPACITY);
    await render(<ChildrenPair active={false} childOpacity={childOpacity} />);
    await waitForFrames();
    await render(<ChildrenPair active childOpacity={childOpacity} />);
    await waitForFrames(3);
    await advanceAnimationTimer(1000);
    await expectFadingLikeReference('child');
    childOpacity.value = CHILD_OPACITY / 2;
    await expectEventually(async () => {
      const [source, child, reference] = await sample([
        'source',
        'child',
        'reference',
      ]);
      return (
        isMoving(source) &&
        !!child &&
        !!reference &&
        isBetween(reference.opacity, 0.05, CHILD_OPACITY - 0.05) &&
        Math.abs(child.opacity - reference.opacity / 2) < 0.02
      );
    }).toBe(true);
    await advanceAnimationTimer(2000);
    await expectOpacity('target', 1);
  });

  test('fades a child inserted into the moving view', async () => {
    await render(<ChildrenPair active={false} />);
    await waitForFrames();
    await render(<ChildrenPair active />);
    await expectFadingLikeReference('child');
    await render(<ChildrenPair active insert />);
    await expectFadingLikeReference('inserted');
    await expectOpacity('target', 1);
    await expectOpacity('inserted', CHILD_OPACITY);
  });

  test('keeps an exiting child in the fade of the moving view', async () => {
    await render(<ChildrenPair active={false} />);
    await waitForFrames();
    await render(<ChildrenPair active />);
    await expectFadingLikeReference('child');

    const frames = await recordFrames(
      ['source', 'child', 'reference'],
      async () => {
        await render(<ChildrenPair active remove />);
        await expectOpacity('target', 1);
      }
    );
    // During the move the exit opacity of the child goes from 1 down to more than 0.5.
    // The child shows the exit opacity times the fade of the reference.
    const fading = frames.filter(
      ([source, child, reference]) =>
        isMoving(source) &&
        !!child &&
        !!reference &&
        isBetween(reference.opacity, 0.05, CHILD_OPACITY - 0.05)
    );
    expect(fading.length > 0).toBe(true);
    expect(
      fading.every(([, child, reference]) => {
        const fade = reference!.opacity / CHILD_OPACITY;
        return isBetween(child!.opacity, fade * 0.5 - 0.02, fade + 0.02);
      })
    ).toBe(true);
  });

  test('keeps the layout animation of a target child instead of a fade-in', async () => {
    await render(<ChildrenPair active={false} />);
    await waitForFrames();
    await render(<ChildrenPair active targetWide />);
    await expectOpacity('target', 0);
    const frames = await recordFrames(['target', 'targetChild'], async () => {
      await expectOpacity('target', 1);
      await expectEventually(async () => {
        const child = await mountedProps('targetChild');
        return !!child && Math.abs(child.width - WIDE_CHILD_WIDTH) < 0.5;
      }).toBe(true);
    });
    const visible = frames.filter(
      ([target, child]) => !!target && target.opacity > 0.99 && !!child
    );
    const [landing] = visible;
    expect(!!landing && landing[1]!.width < WIDE_CHILD_WIDTH - 0.5).toBe(true);
    expect(
      visible.every(
        ([, child]) => Math.abs(child!.opacity - CHILD_OPACITY) < 0.02
      )
    ).toBe(true);
  });

  test.each([true, false])(
    'keeps the fade policy of the first run when the navigation goes back (source fade: %p)',
    async (sourceFades) => {
      await mockAnimationTimer({ autoAdvance: false });
      const sourceConfig = sourceFades ? linearFade : linearNoFade;
      const targetConfig = sourceFades ? linearNoFade : linearFade;
      const pair = (active: boolean) => (
        <ChildrenPair
          active={active}
          sourceConfig={sourceConfig}
          targetConfig={targetConfig}
        />
      );
      await render(pair(false));
      await waitForFrames();
      await render(pair(true));
      await waitForFrames(3);
      await advanceAnimationTimer(1000);
      const [forward, forwardChild] = await sample(['source', 'child']);
      expect(isMoving(forward)).toBe(true);
      expect(
        !!forwardChild &&
          (sourceFades
            ? forwardChild.opacity < CHILD_OPACITY - 0.1
            : Math.abs(forwardChild.opacity - CHILD_OPACITY) < 0.02)
      ).toBe(true);

      await render(pair(false));
      await waitForFrames(3);
      await advanceAnimationTimer(500);
      const [back, backChild] = await sample(['source', 'child']);
      expect(isMoving(back)).toBe(true);
      expect(!!forward && !!back && back.width < forward.width - 0.5).toBe(
        true
      );
      expect(
        !!forwardChild &&
          !!backChild &&
          (sourceFades
            ? isBetween(
                backChild.opacity,
                forwardChild.opacity + 0.02,
                CHILD_OPACITY - 0.01
              )
            : Math.abs(backChild.opacity - CHILD_OPACITY) < 0.02)
      ).toBe(true);
      await advanceAnimationTimer(3000);
      await expectOpacity('source', 1);
      await expectOpacity('child', CHILD_OPACITY);
      await expectOpacity('target', 0);
    }
  );

  test('fades the nested target children in only after the outer target shows', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<NestedScreens showTarget={false} />);
    await waitForFrames();

    await render(<NestedScreens showTarget />);
    await waitForFrames(3);
    // The inner move ends at 600 ms, the outer move at 3000 ms.
    await advanceAnimationTimer(1200);
    await expectOpacity('nestedOuterTarget', 0);
    for (let frame = 0; frame < 5; frame++) {
      const [outerTarget, innerTarget] = await sample([
        'nestedOuterTarget',
        'nestedInnerTarget',
      ]);
      expect(outerTarget?.opacity).toBe(0);
      expect(innerTarget?.opacity).toBe(0);
      await waitForFrames(1);
    }

    await advanceAnimationTimer(1900);
    await expectOpacity('nestedOuterTarget', 1);
    await advanceAnimationTimer(150);
    await expectEventually(async () => {
      const [outerTarget, innerTarget, child] = await sample([
        'nestedOuterTarget',
        'nestedInnerTarget',
        'nestedInnerTargetChild',
      ]);
      return (
        outerTarget?.opacity === 1 &&
        innerTarget?.opacity === 1 &&
        !!child &&
        isBetween(child.opacity, 0.05, CHILD_OPACITY - 0.05)
      );
    }).toBe(true);
    await advanceAnimationTimer(300);
    await expectOpacity('nestedInnerTargetChild', CHILD_OPACITY);
  });

  test('does not raise the child opacity again when the moving spring overshoots', async () => {
    const spring = SharedTransition.springify().dampingRatio(0.3).fadeContent();
    await render(<ChildrenPair active={false} sourceConfig={spring} />);
    await waitForFrames();
    const frames = await recordFrames(['source', 'child'], async () => {
      await render(<ChildrenPair active sourceConfig={spring} />);
      await expectOpacity('target', 1);
    });
    const moving = frames.filter(
      ([source, child]) => !!source && source.opacity > 0.99 && !!child
    );
    const opacities = moving.map(([, child]) => child!.opacity);
    const zero = opacities.findIndex((opacity) => opacity < 0.001);
    expect(opacities.some((opacity) => opacity > 0.1)).toBe(true);
    expect(moving.some(([source]) => source!.width > TARGET_WIDTH + 1)).toBe(
      true
    );
    expect(zero >= 0 && opacities.length - zero > 3).toBe(true);
    expect(opacities.slice(zero).every((opacity) => opacity < 0.01)).toBe(true);
    await expectOpacity('child', CHILD_OPACITY);
  });

  test.each([0.4, Number.MIN_VALUE])(
    'ends the fade-out at fadeOut.end %p of the move',
    async (end) => {
      const earlyFadeOut = SharedTransition.duration(3000)
        .easing(Easing.linear)
        .fadeContent({ fadeOut: { end } });
      await render(
        <Screens showTarget={false} sharedTransition={earlyFadeOut} />
      );
      await waitForFrames();
      const recorder = recordFrames(['source', 'sourceChild']);

      await render(<Screens showTarget sharedTransition={earlyFadeOut} />);
      await expectOpacity('target', 1);
      const frames = await recorder.stop();
      const moving = frames.filter(
        ([source, child]) => isMoving(source) && !!child
      );
      const errors = moving.map(([source, child]) => {
        const progress =
          (source!.width - SOURCE_WIDTH) / (TARGET_WIDTH - SOURCE_WIDTH);
        const expected = CHILD_OPACITY * Math.max(0, 1 - progress / end);
        return Math.abs(child!.opacity - expected);
      });
      expect(moving.length >= 3).toBe(true);
      expect(errors.every((error) => error < 0.03)).toBe(true);
      expect(
        frames.every(([, child]) => !child || Number.isFinite(child.opacity))
      ).toBe(true);

      await expectOpacity('targetChild', CHILD_OPACITY);
    }
  );

  test('fades the children of the target in over fadeIn.duration', async () => {
    await mockAnimationTimer(false);
    const slowFadeIn = SharedTransition.duration(600).fadeContent({
      fadeIn: { duration: 3000 },
    });
    await render(<Screens showTarget={false} sharedTransition={slowFadeIn} />);
    await waitForFrames();

    await render(<Screens showTarget sharedTransition={slowFadeIn} />);
    await waitForFrames(3);
    await advanceAnimationTimer(600);
    await expectOpacity('target', 1);
    // The fade-in eases out. The default fade-in lasts 300 ms here.
    for (const elapsed of [1000, 2000]) {
      await advanceAnimationTimer(1000);
      const progress = elapsed / 3000;
      const expected = CHILD_OPACITY * (1 - (1 - progress) ** 2);
      const child = await mountedProps('targetChild');
      expect(!!child && Math.abs(child.opacity - expected) < 0.02).toBe(true);
    }

    await advanceAnimationTimer(1000);
    await expectOpacity('targetChild', CHILD_OPACITY);
  });
});

// Records the named views on each UI frame while `during` runs.
async function recordFrames(names: string[], during: () => Promise<void>) {
  const viewTags = names.map(tagOf);
  const running = makeMutable(true);
  const frames = makeMutable<(ViewSample | null)[][]>([]);
  scheduleOnUI(() => {
    'worklet';
    const record = () => {
      if (!running.value) {
        return;
      }
      const views = viewTags.map((tag) => {
        const view = global._obtainMountedViewProps(tag, false);
        return view ? { width: view.width, opacity: view.opacity } : null;
      });
      frames.value = [...frames.value, views];
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  let recorded: (ViewSample | null)[][] = [];
  try {
    await during();
  } finally {
    recorded = await runOnUIBlocking(() => {
      'worklet';
      running.value = false;
      return frames.value;
    });
  }
  return recorded;
}

const styles = StyleSheet.create({
  nestedOuterSource: { width: 100, height: 100, backgroundColor: '#22aa55' },
  nestedInnerTarget: { width: 90, height: 90, backgroundColor: '#ffcc00' },
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
  enteringChild: {
    width: 20,
    height: 15,
    backgroundColor: '#ffffff',
  },
});
