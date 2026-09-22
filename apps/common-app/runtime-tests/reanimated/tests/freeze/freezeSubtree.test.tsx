import React, { useEffect, useState } from 'react';
import { Freeze } from 'react-freeze';
import { View } from 'react-native';
import Animated, {
  css,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  callTracker,
  clearRenderOutput,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  getTrackerCallCount,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

// The automated half of the `❄️ React freeze` example screen
// (apps/common-app/src/apps/reanimated/examples/FreezeExample.tsx). The four
// animated pieces below are that screen's, with two deliberate deviations:
//
//   * the screen animates `transform: translateX` in its two useAnimatedStyle
//     views and `backgroundColor` in the CSS animation. Neither can be read back
//     from native - `getViewProp` serves eight props, and `backgroundColor` is
//     routed to the platform transition backend in fabric-example - so every
//     view here animates `left` instead;
//   * the screen freezes by navigating a native stack and toggles the switch by
//     tapping. ReJest has neither, so both are driven by props. That means this
//     suite covers the Suspense semantics but NOT react-native-screens' own
//     freezing - the navigator cases stay manual.
//
// The durations are the screen's shape at a tenth of its length: 10s is there so
// a human can watch.

const DEMO_DURATION_MS = 1500;
const FROM = -100;
const TO = 100;

const SWITCH_DURATION_MS = 300;
const SWITCH_TRAVEL_PX = 20;

// The three boxes are compared against each other, never against the wall clock,
// which is the invariant the example screen is built around. Reads go out in
// parallel but land a frame or two apart, and the transition starts one frame
// after the other two, so ~6px of spread is normal at 200px/1.5s. A restart or a
// pause across the freeze is worth 50px or more.
const SPREAD_TOLERANCE_PX = 20;
const FREEZE_MS = 400;

// Host views re-attach a frame or two after a thaw, and `render` only waits for
// refs it has not seen before, so a read right after a thaw can arrive early.
const REATTACH_TIMEOUT_MS = 1000;

const CSS_ANIMATION_REF = 'freezeCssAnimationBox';
const CSS_TRANSITION_REF = 'freezeCssTransitionBox';
const ANIMATED_STYLE_REF = 'freezeAnimatedStyleBox';
const SWITCH_REF = 'freezeSwitchToggle';

const BOX_REFS = [CSS_ANIMATION_REF, CSS_TRANSITION_REF, ANIMATED_STYLE_REF];

enum Tracker {
  // Runs once per React instance. Effects are destroyed both when React unmounts
  // a subtree and when it only hides a suspended one, so the mount/unmount pair
  // cannot tell those apart - a second construction can.
  SubtreeConstructed = 'freezeSubtreeConstructed',
  SubtreeMounted = 'freezeSubtreeMounted',
  SubtreeUnmounted = 'freezeSubtreeUnmounted',
}

async function readLeft(name: string) {
  const deadline = performance.now() + REATTACH_TIMEOUT_MS;
  let lastError: unknown = null;

  do {
    try {
      return Number(await getTestComponent(name).getAnimatedStyle('left'));
    } catch (error) {
      lastError = error;
      await waitForFrames(1);
    }
  } while (performance.now() < deadline);

  throw new Error(
    `Could not read \`left\` of '${name}' within ${REATTACH_TIMEOUT_MS}ms: ${String(lastError)}`
  );
}

/** Whether the view is still in the hierarchy; a frozen subtree's is not. */
async function isAttached(name: string) {
  try {
    await getTestComponent(name).getAnimatedStyle('left');
    return true;
  } catch {
    return false;
  }
}

function readBoxes() {
  return Promise.all(BOX_REFS.map((name) => readLeft(name)));
}

/**
 * Empty when the three boxes are within `SPREAD_TOLERANCE_PX` of one another,
 * otherwise every box and where it is, so a failure names the odd one out.
 */
function spreadReport(values: number[]) {
  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= SPREAD_TOLERANCE_PX) {
    return '';
  }

  return BOX_REFS.map((name, index) => `${name}=${values[index].toFixed(1)}`)
    .join(', ')
    .concat(` (spread ${spread.toFixed(1)}px)`);
}

/**
 * The four registries `_registriesLeakCheck` reports on, reduced to the ones
 * that still hold records. An empty string means nothing leaked.
 */
function leakingRegistries() {
  if (typeof global._registriesLeakCheck !== 'function') {
    return '`_registriesLeakCheck` is missing - it is only installed in a build with IS_REANIMATED_EXAMPLE_APP';
  }

  return global
    ._registriesLeakCheck()
    .split('\n')
    .filter((line) => line.includes('❌'))
    .map((line) => line.trim())
    .join(', ');
}

describe('react-freeze', () => {
  const AnimatedSwitch = ({ on }: { on: boolean }) => {
    const ref = useTestRef(SWITCH_REF);
    const isOn = useSharedValue(false);

    useEffect(() => {
      isOn.set(on);
    }, [isOn, on]);

    const animatedStyles = useAnimatedStyle(() => {
      return {
        left: withTiming(isOn.get() ? SWITCH_TRAVEL_PX : 0, {
          duration: SWITCH_DURATION_MS,
        }),
      };
    });

    return (
      <View style={styles.switchContainer}>
        <Animated.View ref={ref} style={[styles.toggle, animatedStyles]} />
      </View>
    );
  };

  const CSSAnimation = () => {
    const ref = useTestRef(CSS_ANIMATION_REF);

    return <Animated.View ref={ref} style={styles.animationBox} />;
  };

  const CSSTransition = () => {
    const ref = useTestRef(CSS_TRANSITION_REF);
    const [state, setState] = useState(true);

    useEffect(() => {
      setTimeout(() => setState((x) => !x));
    }, []);

    return (
      <Animated.View
        ref={ref}
        style={[styles.transitionBox, { left: state ? FROM : TO }]}
      />
    );
  };

  const AnimatedStyleAnimation = () => {
    const ref = useTestRef(ANIMATED_STYLE_REF);
    const sv = useSharedValue(FROM);

    useEffect(() => {
      sv.value = TO;
    }, [sv]);

    const animatedStyle = useAnimatedStyle(() => ({
      left: withTiming(sv.value, {
        duration: DEMO_DURATION_MS,
        easing: Easing.linear,
      }),
    }));

    return <Animated.View ref={ref} style={[styles.box, animatedStyle]} />;
  };

  const LifecycleProbe = () => {
    useState(() => callTracker(Tracker.SubtreeConstructed));

    useEffect(() => {
      callTracker(Tracker.SubtreeMounted);

      return () => callTracker(Tracker.SubtreeUnmounted);
    }, []);

    return null;
  };

  /** The example screen's `HomeScreen`, minus the navigation and the buttons. */
  function FreezeFixture({
    frozen = false,
    switchOn = false,
  }: {
    frozen?: boolean;
    switchOn?: boolean;
  }) {
    return (
      <Freeze freeze={frozen}>
        <View style={styles.container}>
          <LifecycleProbe />
          <AnimatedSwitch on={switchOn} />
          <CSSAnimation />
          <CSSTransition />
          <AnimatedStyleAnimation />
        </View>
      </Freeze>
    );
  }

  async function freezeFor(durationMs: number, switchOn = false) {
    await render(<FreezeFixture frozen switchOn={switchOn} />);
    await wait(durationMs);
    await render(<FreezeFixture switchOn={switchOn} />);
  }

  test('the three animation kinds advance together', async () => {
    await render(<FreezeFixture />);

    await wait(DEMO_DURATION_MS / 5);
    const early = await readBoxes();
    expect(spreadReport(early)).toBe('');

    await wait(DEMO_DURATION_MS / 5);
    const later = await readBoxes();
    expect(spreadReport(later)).toBe('');

    // `left` is read as the Yoga frame origin, which the centred container
    // offsets, so progress is measured as travel rather than as an absolute
    // position. A fifth of the 200px trip is 40px.
    expect(later[0] - early[0]).toBeWithinRange(20, 60);
  });

  test('a frozen subtree is detached but never torn down', async () => {
    await render(<FreezeFixture />);
    expect(await isAttached(SWITCH_REF)).toBe(true);

    await render(<FreezeFixture frozen />);
    await waitForFrames(2);

    // The freeze has to be real: React takes the suspended subtree's host views
    // out of the hierarchy, so nothing inside it can be read.
    expect(await isAttached(SWITCH_REF)).toBe(false);

    await render(<FreezeFixture />);
    await expectEventually(() => isAttached(SWITCH_REF)).toBe(true);

    // Yet nothing was thrown away: the instance is never re-created and its
    // effects are never torn down. Everything the cases below assume about an
    // animation crossing a freeze follows from these three numbers.
    expect(await getTrackerCallCount(Tracker.SubtreeConstructed)).toBeCalledJS(
      1
    );
    expect(await getTrackerCallCount(Tracker.SubtreeMounted)).toBeCalledJS(1);
    expect(await getTrackerCallCount(Tracker.SubtreeUnmounted)).toBeCalledJS(0);
  });

  test('animations keep running while the subtree is frozen', async () => {
    await render(<FreezeFixture />);
    await wait(200);
    const before = await readBoxes();
    expect(spreadReport(before)).toBe('');

    await freezeFor(FREEZE_MS);
    await waitForFrames(2);

    const after = await readBoxes();
    expect(spreadReport(after)).toBe('');
    // `FREEZE_MS` of a `DEMO_DURATION_MS` trip across 200px is ~53px. A freeze
    // that paused the clock would show ~0, one that restarted it would show a
    // large negative.
    expect(after[0] - before[0]).toBeWithinRange(35, 95);
  });

  test('survives repeated freeze cycles', async () => {
    await render(<FreezeFixture />);

    let previous = await readBoxes();

    for (let cycle = 0; cycle < 3; cycle++) {
      await freezeFor(150);
      await waitForFrames(2);

      const current = await readBoxes();
      expect(spreadReport(current)).toBe('');
      // Monotonic across every cycle - never a restart, never a rewind.
      expect(current[0] - previous[0]).toBeWithinRange(10, 95);
      previous = current;
    }
  });

  test('holds the finished state across a freeze', async () => {
    await render(<FreezeFixture />);
    await wait(DEMO_DURATION_MS + 200);

    const settled = await readBoxes();
    expect(spreadReport(settled)).toBe('');
    expect(settled[0]).toBeWithinRange(TO - 1, TO + 1);

    await freezeFor(FREEZE_MS);
    await waitForFrames(2);

    // `animationFillMode: 'both'` and the settled transition both have to
    // survive: nothing reverts to `FROM` and nothing replays.
    const afterFreeze = await readBoxes();
    expect(spreadReport(afterFreeze)).toBe('');
    expect(afterFreeze[0]).toBeWithinRange(TO - 1, TO + 1);
  });

  test('every box animates again after a thaw', async () => {
    await render(<FreezeFixture />);
    await wait(200);
    await freezeFor(FREEZE_MS);

    // Whatever a freeze does to the clock, no box may come back detached or
    // stuck: each one still has to reach its target.
    for (const name of BOX_REFS) {
      await expectEventually(
        () => readLeft(name),
        DEMO_DURATION_MS + 1000
      ).toBeWithinRange(TO - 1, TO + 1);
    }
  });

  test('the switch still animates after a freeze cycle', async () => {
    await render(<FreezeFixture />);
    const resting = await readLeft(SWITCH_REF);

    await freezeFor(FREEZE_MS);

    await render(<FreezeFixture switchOn />);
    await expectEventually(
      () => readLeft(SWITCH_REF),
      SWITCH_DURATION_MS + 1000
    ).toBeWithinRange(
      resting + SWITCH_TRAVEL_PX - 1,
      resting + SWITCH_TRAVEL_PX + 1
    );

    await render(<FreezeFixture />);
    await expectEventually(
      () => readLeft(SWITCH_REF),
      SWITCH_DURATION_MS + 1000
    ).toBeWithinRange(resting - 1, resting + 1);
  });

  describe('registry leaks', () => {
    // `_registriesLeakCheck` reports on the whole app, and the runtime-tests
    // host renders nothing animated of its own, so an empty render area must
    // mean empty registries. A failure here points at a leak in an earlier
    // suite rather than at this one.
    test('the registries start empty', async () => {
      await clearRenderOutput();

      await expectEventually(leakingRegistries).toBe('');
    });

    test('unmounting a running subtree leaves no records behind', async () => {
      await render(<FreezeFixture />);
      await wait(200);
      await clearRenderOutput();

      await expectEventually(leakingRegistries).toBe('');
    });

    test('unmounting a settled subtree leaves no records behind', async () => {
      await render(<FreezeFixture />);
      await wait(DEMO_DURATION_MS + 200);
      await clearRenderOutput();

      await expectEventually(leakingRegistries).toBe('');
    });

    test('unmounting a frozen subtree leaves no records behind', async () => {
      await render(<FreezeFixture />);
      await wait(200);
      await render(<FreezeFixture frozen />);
      await waitForFrames(2);
      await clearRenderOutput();

      await expectEventually(leakingRegistries).toBe('');
    });
  });
});

const styles = css.create({
  container: {
    // The screen centres its boxes. `left` is read back as the Yoga frame
    // origin, so centring would offset every reading by half the container
    // width; left-aligning makes `left` read as the raw offset.
    alignItems: 'flex-start',
    rowGap: 40,
  },
  switchContainer: {
    width: 50,
    height: 25,
    backgroundColor: '#ccc',
    borderRadius: 25,
    padding: 2,
  },
  toggle: {
    height: 21,
    width: 21,
    borderRadius: 10.5,
    backgroundColor: '#fff',
  },
  animationBox: {
    width: 100,
    height: 50,
    animationDuration: DEMO_DURATION_MS,
    animationFillMode: 'both',
    animationTimingFunction: 'linear',
    animationName: {
      from: { left: FROM },
      to: { left: TO },
    },
  },
  transitionBox: {
    width: 100,
    height: 50,
    backgroundColor: 'blue',
    transitionDuration: DEMO_DURATION_MS,
    transitionProperty: 'left',
    transitionTimingFunction: 'linear',
  },
  box: {
    width: 100,
    height: 50,
    backgroundColor: 'pink',
  },
});
