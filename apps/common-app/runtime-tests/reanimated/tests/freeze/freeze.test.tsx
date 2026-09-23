import {
  NavigationContainer,
  NavigationIndependentTree,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

// The `❄️ React freeze` example screen
// (apps/common-app/src/apps/reanimated/examples/FreezeExample.tsx) as a runtime
// test: three boxes animating the same property over the same duration through
// three different backends, plus the screen's switch, all inside a `<Freeze>`.
//
// The subtree is the same everywhere. What differs is the *environment* the
// freeze happens in, and that is the one variable this suite is built around:
//
//   * `prop-driven` hides the subtree by re-rendering it with `frozen`, with
//     nothing else in the picture. This is the control.
//   * `under a native stack` hides it the way the screen does - the home
//     screen's own button sets `frozen` and pushes screen 1, so
//     react-native-screens detaches the screen on top of React's Suspense.
//
// Navigation does not freeze anything by itself: react-native-screens defaults
// `freezeOnBlur` to `freezeEnabled()`, which is `false` until an app calls
// `enableFreeze()`, and nothing in this repo does. The `<Freeze>` below is the
// only freezing in either environment.
//
// Two deviations from the screen, both forced by what can be read back from
// native - `getViewProp` serves eight props and no transform:
//
//   * every box animates `left` where the screen animates `translateX`. The
//     range is moved so the boxes stay on screen, as they do on the screen
//     itself: a 100px box sits at 20..120 at the start and 200..300 at the end;
//   * button presses are function calls. ReJest cannot tap, so the switch and
//     every screen register their `onPress` handlers in `controls` and the test
//     calls them. The handler bodies are the screen's, verbatim.

const DEMO_DURATION_MS = 4000;

// The freeze has to dominate the run, otherwise a case that claims to measure
// what happens *during* a freeze is mostly measuring what happens around it.
// 2200ms of a 4000ms animation is ~55% in the prop-driven environment and ~70%
// under the navigator, where a push and a pop add their own time.
const FREEZE_MS = 2200;

// Preserving state across a freeze is instantaneous - it either survived the
// hide or it did not - so those cases do not need to pay for a long one.
const SHORT_FREEZE_MS = 600;

const FROM = 20;
const TO = 200;
const TRAVEL = TO - FROM;
const MIDPOINT = (FROM + TO) / 2;

const SWITCH_DURATION_MS = 300;
const SWITCH_TRAVEL_PX = 20;

// The three boxes are compared against each other, never against the wall
// clock, which is the invariant the example screen is built around. Reads go
// out in parallel but land a frame or two apart, and the transition starts one
// frame after the other two, so a few px of spread is normal. A restart or a
// pause across the freeze is worth 50px or more.
const SPREAD_TOLERANCE_PX = 20;

// Travel is checked against the wall time between two reads. The slack is what
// a re-render, a push, a pop and a re-attach can add on either side of a read,
// expressed in pixels at the animation's own speed.
const TIMING_TOLERANCE_MS = 500;
const TIMING_TOLERANCE_PX = (TIMING_TOLERANCE_MS / DEMO_DURATION_MS) * TRAVEL;

// Two of the three boxes start from an effect, and an effect that has not
// reached the UI runtime before React hides the subtree does not start at all -
// it starts at the thaw instead. Every case therefore waits for all three to be
// moving before it freezes anything. `BOX_START_PX` is ~45ms of travel,
// comfortably clear of the pixel grid's rounding.
const BOX_START_PX = 2;
const BOX_START_TIMEOUT_MS = 2000;

// How long `worstAlignmentReport` samples for, and how many frames it leaves
// between samples. Each sample is three native round trips, and a drift worth
// catching lasts far longer than three frames.
const ALIGNMENT_WATCH_MS = 400;
const ALIGNMENT_SAMPLE_FRAMES = 3;

// A thaw has to finish and React has to re-attach the host views before
// anything inside the subtree can be read, and `render` only waits for refs it
// has not seen before.
// When React shows the subtree again it re-commits the host views with the
// style `PropsFilter` cached on the very first render - for these boxes that is
// `left: FROM`. The next animation frame overwrites it, so the stale value is
// only readable for a frame or two: sampling every two frames after a thaw read
// `anim=20` at +2ms and `anim=126`, level with the CSS boxes, at +36ms. Reading
// inside that window measures the re-commit rather than the animation, so every
// thaw settles first.
const THAW_SETTLE_FRAMES = 3;

const REATTACH_TIMEOUT_MS = 3000;
const CONTROL_TIMEOUT_MS = 5000;

const CSS_ANIMATION_REF = 'freezeCssAnimationBox';
const CSS_TRANSITION_REF = 'freezeCssTransitionBox';
const ANIMATED_STYLE_REF = 'freezeAnimatedStyleBox';
const SWITCH_REF = 'freezeSwitchToggle';

const BOX_REFS = [CSS_ANIMATION_REF, CSS_TRANSITION_REF, ANIMATED_STYLE_REF];

// Every check returns its verdict as a string: one of these when it is
// satisfied, or a sentence naming the offending boxes when it is not. ReJest
// prints `Expected <expected> received <actual>`, so a red line reads as
// `Expected aligned received <what actually happened>` rather than comparing
// against an empty string, which prints as nothing at all.
const ALIGNED = 'aligned';
const IN_RANGE = 'in range';
const ON_TIME = 'on time';
const ALL_STARTED = 'all started';
const NO_LEAKS = 'no leaks';

// Runs once per React instance. React detaches a hidden subtree's host views
// but leaves its effects connected (`a frozen subtree is detached but never
// torn down` asserts both), so an effect cleanup never fires for a freeze and a
// mount/unmount pair could not tell a freeze from a teardown anyway. A second
// construction can.
const SUBTREE_CONSTRUCTED = 'freezeSubtreeConstructed';

const SWITCH_TOGGLE = 'switch/toggle';
const HOME_TO_SCREEN_1 = 'home/goToScreen1';
const SCREEN_1_TO_SCREEN_2 = 'screen1/goToScreen2';
const SCREEN_2_TO_SCREEN_3 = 'screen2/goToScreen3';
const BACK_BUTTONS = ['screen3/goBack', 'screen2/goBack', 'screen1/goBack'];

/**
 * The handlers the rendered tree is currently offering, which doubles as a
 * record of what is mounted: a screen registers on mount and drops out on
 * unmount, so waiting for a key to appear or disappear is how this suite waits
 * for a push or a pop to land.
 */
const controls: Record<string, () => void> = {};

function useControl(name: string, handler: () => void) {
  useEffect(() => {
    controls[name] = handler;

    return () => {
      if (controls[name] === handler) {
        delete controls[name];
      }
    };
  });
}

async function waitForControl(
  name: string,
  present: boolean,
  timeoutMs = CONTROL_TIMEOUT_MS
) {
  const deadline = performance.now() + timeoutMs;

  while (name in controls !== present) {
    if (performance.now() > deadline) {
      throw new Error(
        `'${name}' was ${present ? 'never registered' : 'still registered'} after ${timeoutMs}ms`
      );
    }
    await waitForFrames(1);
  }
}

/** Presses a button once it exists, the way a user would have to. */
async function press(name: string) {
  await waitForControl(name, true);
  controls[name]();
  await waitForFrames(1);
}

async function readLeft(name: string, timeoutMs = REATTACH_TIMEOUT_MS) {
  const deadline = performance.now() + timeoutMs;
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
    `Could not read \`left\` of '${name}' within ${timeoutMs}ms: ${String(lastError)}`
  );
}

/**
 * Whether the view is still in the hierarchy; a frozen subtree's is not.
 *
 * React detaches the ref when it hides the subtree, so a missing tag is the
 * signature of a freeze and the only thing reported as detached. Anything else
 * that goes wrong with the read is a real problem and is left to throw, rather
 * than being reported here as a successful freeze.
 */
async function isAttached(name: string) {
  const component = getTestComponent(name);

  if (component.getTag() === -1) {
    return false;
  }

  await component.getAnimatedStyle('left');

  return true;
}

/** Box positions, the refs they belong to, and when they were in hand. */
type Reading = {
  refs: readonly string[];
  values: number[];
  at: number;
};

async function readBoxes(refs: readonly string[] = BOX_REFS): Promise<Reading> {
  const values = await Promise.all(refs.map((name) => readLeft(name)));

  return { refs, values, at: performance.now() };
}

/**
 * `ALIGNED` when the boxes are within `SPREAD_TOLERANCE_PX` of one another,
 * otherwise every box, where it is and by how far they disagree.
 */
function alignmentReport({ refs, values }: Reading) {
  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= SPREAD_TOLERANCE_PX) {
    return ALIGNED;
  }

  const positions = refs
    .map((name, index) => `${name}=${values[index].toFixed(1)}`)
    .join(', ');

  return `${positions} - spread ${spread.toFixed(1)}px, tolerated ${SPREAD_TOLERANCE_PX}px`;
}

/**
 * `IN_RANGE` when every box sits inside [`min`, `max`], otherwise the ones that
 * do not and the band they were measured against.
 */
function rangeReport({ refs, values }: Reading, min: number, max: number) {
  const outside = refs
    .map((name, index) => ({ name, value: values[index] }))
    .filter(({ value }) => value < min || value > max);

  if (outside.length === 0) {
    return IN_RANGE;
  }

  return outside
    .map(({ name, value }) => `${name}=${value.toFixed(1)}`)
    .join(', ')
    .concat(` - outside [${min.toFixed(1)}, ${max.toFixed(1)}]`);
}

/**
 * Samples the boxes for `durationMs` and reports the worst misalignment seen,
 * or `ALIGNED` if they never drifted apart. One reading pair can land a frame
 * or two apart, so a window of samples is what tells a drifting box from a
 * late-read one.
 */
async function worstAlignmentReport(
  durationMs: number,
  refs: readonly string[] = BOX_REFS
) {
  const deadline = performance.now() + durationMs;
  let worstSpread = 0;
  let report = ALIGNED;

  do {
    const reading = await readBoxes(refs);
    const spread = Math.max(...reading.values) - Math.min(...reading.values);

    if (spread > worstSpread) {
      worstSpread = spread;
      report = alignmentReport(reading);
    }

    await waitForFrames(ALIGNMENT_SAMPLE_FRAMES);
  } while (performance.now() < deadline);

  return report;
}

/**
 * Waits until every box has left `FROM`, then names the ones that never did. A
 * box still sitting on `FROM` has not started, and a freeze measured from there
 * would report the start-up rather than the freeze.
 */
async function startedReport(
  refs: readonly string[] = BOX_REFS,
  timeoutMs = BOX_START_TIMEOUT_MS
) {
  const deadline = performance.now() + timeoutMs;
  let values = (await readBoxes(refs)).values;

  while (
    values.some((value) => value < FROM + BOX_START_PX) &&
    performance.now() < deadline
  ) {
    await waitForFrames(1);
    values = (await readBoxes(refs)).values;
  }

  const stalled = refs.filter(
    (_, index) => values[index] < FROM + BOX_START_PX
  );

  if (stalled.length === 0) {
    return ALL_STARTED;
  }

  return `${stalled.join(', ')} - still on ${FROM} after ${timeoutMs}ms`;
}

/**
 * `ON_TIME` when every box moved by the distance the wall time between the two
 * reads is worth. A freeze that paused the clock reports ~0 travel, one that
 * restarted it reports a large negative.
 */
function travelReport(before: Reading, after: Reading): string {
  const elapsedMs = after.at - before.at;
  const nominal = (elapsedMs / DEMO_DURATION_MS) * TRAVEL;

  const offenders = after.refs
    .map((name, index) => ({
      name,
      travel: after.values[index] - before.values[index],
      // A box that reached `TO` inside the window cannot have travelled the
      // whole nominal distance, so cap what is asked of it by how far it had
      // left to go.
      expected: Math.min(nominal, TO - before.values[index]),
    }))
    .filter(
      ({ travel, expected }) =>
        Math.abs(travel - expected) > TIMING_TOLERANCE_PX
    );

  if (offenders.length === 0) {
    return ON_TIME;
  }

  return offenders
    .map(
      ({ name, travel, expected }) =>
        `${name} moved ${travel.toFixed(1)}px, expected ${expected.toFixed(1)}px`
    )
    .join(', ')
    .concat(` in ${elapsedMs.toFixed(0)}ms (±${TIMING_TOLERANCE_PX}px)`);
}

/**
 * `NO_LEAKS` when none of the four registries `_registriesLeakCheck` reports on
 * still holds records, otherwise the ones that do.
 */
function leakingRegistries() {
  if (typeof global._registriesLeakCheck !== 'function') {
    return '`_registriesLeakCheck` is missing - it is only installed in a build with IS_REANIMATED_EXAMPLE_APP';
  }

  const leaking = global
    ._registriesLeakCheck()
    .split('\n')
    .filter((line) => line.includes('❌'))
    .map((line) => line.trim())
    .join(', ');

  return leaking === '' ? NO_LEAKS : leaking;
}

async function expectAllBoxesToFinish(refs: readonly string[] = BOX_REFS) {
  await expectEventually(
    async () => rangeReport(await readBoxes(refs), TO - 1, TO + 1),
    DEMO_DURATION_MS + 1000
  ).toBe(IN_RANGE);
}

// ---------------------------------------------------------------------------
// The subtree under test - the example screen's four animated pieces
// ---------------------------------------------------------------------------

const AnimatedSwitch = () => {
  const ref = useTestRef(SWITCH_REF);
  const isOn = useSharedValue(false);

  // The example screen's `Pressable`; ReJest cannot tap one.
  useControl(SWITCH_TOGGLE, () => isOn.set((x) => !x));

  const animatedStyles = useAnimatedStyle(() => ({
    left: withTiming(isOn.get() ? SWITCH_TRAVEL_PX : 0, {
      duration: SWITCH_DURATION_MS,
    }),
  }));

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
  useState(() => callTracker(SUBTREE_CONSTRUCTED));

  return null;
};

/** The example screen's `HomeScreen` content, minus the buttons. */
function FreezeFixture({ frozen }: { frozen: boolean }) {
  return (
    <Freeze freeze={frozen}>
      <View style={styles.container}>
        <LifecycleProbe />
        <AnimatedSwitch />
        <CSSAnimation />
        <CSSTransition />
        <AnimatedStyleAnimation />
      </View>
    </Freeze>
  );
}

// ---------------------------------------------------------------------------
// Environment 1: the fixture on its own, frozen by a prop
// ---------------------------------------------------------------------------

function PlainFixture({ frozen }: { frozen: boolean }) {
  return <FreezeFixture frozen={frozen} />;
}

// ---------------------------------------------------------------------------
// Environment 2: the fixture inside the example screen's native stack
// ---------------------------------------------------------------------------

type StackParamList = {
  home: undefined;
  screen1: undefined;
  screen2: undefined;
  screen3: undefined;
};

type StackNavigation = NativeStackNavigationProp<StackParamList>;

function HomeScreen() {
  const navigation = useNavigation<StackNavigation>();
  const isFocused = useIsFocused();
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (isFocused) {
      setFrozen(false);
    }
  }, [isFocused]);

  useControl(HOME_TO_SCREEN_1, () => {
    setFrozen(true);
    navigation.navigate('screen1');
  });

  return <FreezeFixture frozen={frozen} />;
}

function Screen1() {
  const navigation = useNavigation<StackNavigation>();

  useControl(SCREEN_1_TO_SCREEN_2, () => navigation.navigate('screen2'));
  useControl('screen1/goBack', () => navigation.goBack());

  return <View style={[styles.container, styles.screenOne]} />;
}

function Screen2() {
  const navigation = useNavigation<StackNavigation>();

  useControl(SCREEN_2_TO_SCREEN_3, () => navigation.navigate('screen3'));
  useControl('screen2/goBack', () => navigation.goBack());

  return <View style={[styles.container, styles.screenTwo]} />;
}

function Screen3() {
  const navigation = useNavigation<StackNavigation>();

  useControl('screen3/goBack', () => navigation.goBack());

  return <View style={[styles.container, styles.screenThree]} />;
}

const Stack = createNativeStackNavigator<StackParamList>();

function NavigatorFixture() {
  return (
    // The runtime-tests host has no navigation container of its own today; the
    // independent tree keeps this suite working if it ever grows one.
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName="home">
          <Stack.Screen name="home" component={HomeScreen} />
          <Stack.Screen name="screen1" component={Screen1} />
          <Stack.Screen name="screen2" component={Screen2} />
          <Stack.Screen name="screen3" component={Screen3} />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}

/** Pops every pushed screen, deepest first, and waits for home to be back. */
async function goHome() {
  for (const button of BACK_BUTTONS) {
    if (button in controls) {
      await press(button);
      await waitForControl(button, false);
    }
  }

  // Home is back once its host views are readable again. A control key cannot
  // gate on that: React leaves a hidden subtree's effects connected, so
  // `SWITCH_TOGGLE` stays registered for the whole trip. A successful read is
  // the only honest signal, and `readLeft` retries until it gets one.
  await readLeft(SWITCH_REF);

  // ...but a successful read is not yet a correct one, so settle here rather
  // than in the driver: the deep-stack cases pop their way back through
  // `goHome` directly and would otherwise read the re-commit.
  await waitForFrames(THAW_SETTLE_FRAMES);
}

// ---------------------------------------------------------------------------
// Drivers - the only thing that differs between the two environments
// ---------------------------------------------------------------------------

type Driver = {
  name: string;
  /** Renders the fixture, thawed, and waits for every box to be moving. */
  mount: () => Promise<void>;
  /** Hides the subtree the way this environment does it. */
  freeze: () => Promise<void>;
  /** Brings it back. */
  thaw: () => Promise<void>;
};

const plainDriver: Driver = {
  name: 'prop-driven',
  mount: async () => {
    await render(<PlainFixture frozen={false} />);
    expect(await startedReport()).toBe(ALL_STARTED);
  },
  freeze: async () => {
    await render(<PlainFixture frozen />);
    await waitForFrames(2);
  },
  thaw: async () => {
    await render(<PlainFixture frozen={false} />);
    await waitForFrames(THAW_SETTLE_FRAMES);
  },
};

const navigatorDriver: Driver = {
  name: 'under a native stack',
  mount: async () => {
    await render(<NavigatorFixture />);
    expect(await startedReport()).toBe(ALL_STARTED);
  },
  freeze: async () => {
    await press(HOME_TO_SCREEN_1);
    await waitForControl(SCREEN_1_TO_SCREEN_2, true);
  },
  thaw: goHome,
};

const DRIVERS = [plainDriver, navigatorDriver];

// ---------------------------------------------------------------------------
// Cases that run in both environments
// ---------------------------------------------------------------------------

for (const driver of DRIVERS) {
  describe(`react-freeze *${driver.name}*`, () => {
    test('animations keep running while the subtree is frozen', async () => {
      await driver.mount();
      expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);

      const before = await readBoxes();

      await driver.freeze();
      await wait(FREEZE_MS);
      await driver.thaw();

      const after = await readBoxes();

      // Still level with one another, and staying that way - a box that came
      // back on a different clock shows up here rather than at the endpoint.
      expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);

      // Past the midpoint and short of the end: the freeze cost more than half
      // of the animation, and the animation spent all of it moving.
      expect(rangeReport(after, MIDPOINT, TO - 1)).toBe(IN_RANGE);

      // ...by exactly the distance the time spent frozen is worth. A freeze
      // that paused the clock reports ~0 travel here, one that restarted it
      // reports a large negative.
      expect(travelReport(before, after)).toBe(ON_TIME);

      await expectAllBoxesToFinish();
    });

    test('the switch keeps its state across a freeze', async () => {
      await driver.mount();

      // `left` is read as the Yoga frame origin, so the resting position is the
      // switch container's padding rather than 0.
      const off = await readLeft(SWITCH_REF);
      const on = off + SWITCH_TRAVEL_PX;

      await press(SWITCH_TOGGLE);
      await expectEventually(
        () => readLeft(SWITCH_REF),
        SWITCH_DURATION_MS + 1000
      ).toBeWithinRange(on - 1, on + 1);

      await driver.freeze();
      await wait(SHORT_FREEZE_MS);
      await driver.thaw();

      // The knob is where it was left: the shared value, the animated style and
      // the host view all came back intact. A subtree that had been torn down
      // and rebuilt would be back at `off`.
      await expectEventually(
        () => readLeft(SWITCH_REF),
        REATTACH_TIMEOUT_MS
      ).toBeWithinRange(on - 1, on + 1);

      // Nothing was built twice: the freeze hid the subtree, it did not replace
      // it.
      expect(await getTrackerCallCount(SUBTREE_CONSTRUCTED)).toBeCalledJS(1);

      // And the switch still answers afterwards.
      await press(SWITCH_TOGGLE);
      await expectEventually(
        () => readLeft(SWITCH_REF),
        SWITCH_DURATION_MS + 1000
      ).toBeWithinRange(off - 1, off + 1);
    });

    test('holds the finished state across a freeze', async () => {
      await driver.mount();
      await expectAllBoxesToFinish();

      await driver.freeze();
      await wait(SHORT_FREEZE_MS);
      await driver.thaw();

      // `animationFillMode: 'both'` and the settled transition both have to
      // survive: nothing reverts to `FROM` and nothing replays.
      const settled = await readBoxes();
      expect(alignmentReport(settled)).toBe(ALIGNED);
      expect(rangeReport(settled, TO - 1, TO + 1)).toBe(IN_RANGE);
    });

    test('unmounting a frozen subtree leaves no records behind', async () => {
      await driver.mount();
      await driver.freeze();
      await wait(SHORT_FREEZE_MS);
      await clearRenderOutput();

      await expectEventually(leakingRegistries).toBe(NO_LEAKS);
    });
  });
}

// ---------------------------------------------------------------------------
// Cases that only the prop-driven environment can express
// ---------------------------------------------------------------------------

describe('react-freeze *prop-driven only*', () => {
  // `_registriesLeakCheck` reports on the whole app, and the runtime-tests host
  // renders nothing animated of its own, so an empty render area must mean
  // empty registries. A failure here points at a leak in an earlier suite
  // rather than at this one.
  test('the registries start empty', async () => {
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });

  test('the three boxes stay aligned for the whole animation', async () => {
    await plainDriver.mount();

    // The example screen's own invariant, watched frame by frame rather than
    // sampled at the ends: whatever each backend does between commits, the
    // three boxes are at the same x throughout.
    expect(await worstAlignmentReport(DEMO_DURATION_MS)).toBe(ALIGNED);

    await expectAllBoxesToFinish();
  });

  test('a frozen subtree is detached but never torn down', async () => {
    await plainDriver.mount();
    expect(await isAttached(SWITCH_REF)).toBe(true);

    await plainDriver.freeze();

    // The freeze has to be real: React takes the hidden subtree's host views
    // out of the hierarchy, so nothing inside it can be read.
    expect(await isAttached(SWITCH_REF)).toBe(false);

    await plainDriver.thaw();
    await expectEventually(() => isAttached(SWITCH_REF)).toBe(true);

    // Yet nothing was thrown away - the instance is never re-created.
    expect(await getTrackerCallCount(SUBTREE_CONSTRUCTED)).toBeCalledJS(1);
  });

  test('survives repeated freeze cycles', async () => {
    await plainDriver.mount();

    let previous = await readBoxes();

    // A cadence no navigator can reach: hidden and shown again three times
    // inside a fifth of the animation.
    for (let cycle = 0; cycle < 3; cycle++) {
      await plainDriver.freeze();
      await wait(150);
      await plainDriver.thaw();
      await waitForFrames(2);

      const current = await readBoxes();
      expect(alignmentReport(current)).toBe(ALIGNED);
      // Monotonic across every cycle - never a restart, never a rewind.
      expect(travelReport(previous, current)).toBe(ON_TIME);
      previous = current;
    }

    await expectAllBoxesToFinish();
  });

  test('unmounting a running subtree leaves no records behind', async () => {
    await plainDriver.mount();
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });

  test('unmounting a settled subtree leaves no records behind', async () => {
    await plainDriver.mount();
    await expectAllBoxesToFinish();
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });
});

// ---------------------------------------------------------------------------
// Cases that only exist once a navigator is involved
// ---------------------------------------------------------------------------

describe('react-freeze *under a native stack only*', () => {
  /** Home -> 1 -> 2 -> 3, dwelling on each one. */
  async function goThreeScreensDeep(dwellMs: number) {
    await navigatorDriver.freeze();
    await wait(dwellMs);
    await press(SCREEN_1_TO_SCREEN_2);
    await waitForControl(SCREEN_2_TO_SCREEN_3, true);
    await wait(dwellMs);
    await press(SCREEN_2_TO_SCREEN_3);
    await waitForControl('screen3/goBack', true);
    await wait(dwellMs);
  }

  test('the boxes keep animating three screens deep', async () => {
    await navigatorDriver.mount();
    expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);

    const before = await readBoxes();

    await goThreeScreensDeep(FREEZE_MS / 3);
    await goHome();

    const after = await readBoxes();

    // Home freezes once no matter how deep the stack goes - pushing screens 2
    // and 3 never touches it - so this differs from the shallow case only in
    // how many transitions ran while it was hidden.
    expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);
    expect(rangeReport(after, MIDPOINT, TO - 1)).toBe(IN_RANGE);
    expect(travelReport(before, after)).toBe(ON_TIME);

    await expectAllBoxesToFinish();
  });

  test('a second round trip picks up where the first one left off', async () => {
    await navigatorDriver.mount();

    let previous = await readBoxes();

    for (let trip = 0; trip < 2; trip++) {
      await navigatorDriver.freeze();
      await wait(SHORT_FREEZE_MS);
      await navigatorDriver.thaw();

      const current = await readBoxes();
      expect(alignmentReport(current)).toBe(ALIGNED);
      // Monotonic across both trips - never a restart, never a rewind.
      expect(travelReport(previous, current)).toBe(ON_TIME);
      previous = current;
    }

    await expectAllBoxesToFinish();
  });

  test('unmounting the navigator three screens deep leaves no records behind', async () => {
    await navigatorDriver.mount();
    await goThreeScreensDeep(SHORT_FREEZE_MS / 3);

    // Home is frozen and buried under three screens - its animations are
    // running with nothing of it on screen.
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });
});

const styles = css.create({
  container: {
    flex: 1,
    // Left-aligned so `left` reads as the raw frame origin rather than the
    // centred one - see the note on `FROM` and `TO`.
    alignItems: 'flex-start',
    rowGap: 40,
  },
  // The pushed screens carry no content of their own, so without these the
  // whole trip looks like one blank screen when a human watches the run. A
  // different tint per screen makes every push and pop visible.
  screenOne: {
    backgroundColor: '#ef9a9a',
  },
  screenTwo: {
    backgroundColor: '#a5d6a7',
  },
  screenThree: {
    backgroundColor: '#90caf9',
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
    backgroundColor: 'green',
    animationDuration: DEMO_DURATION_MS,
    animationFillMode: 'both',
    animationTimingFunction: 'linear',
    animationName: {
      from: {
        backgroundColor: 'red',
        left: FROM,
      },
      to: {
        backgroundColor: 'green',
        left: TO,
      },
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
