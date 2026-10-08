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
import { Platform, Text, View } from 'react-native';
import Animated, {
  css,
  Easing,
  getStaticFeatureFlag,
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

// The `❄️ React freeze` example screen as a runtime test, frozen by a prop
// (`propDriven.test.tsx`) or by pushing a native stack screen
// (`nativeStack.test.tsx`). Only `<Freeze>` freezes: nothing calls
// `enableFreeze()`, so react-native-screens does not.
//
// One box per driver and update path (fabric-example flags):
//
//   box                         driver            prop     path
//   freezeCssAnimationBox       CSS animation     left     CSS loop -> commit
//   freezeCssTransitionBox      CSS transition    left     CSS loop -> commit
//   freezeAnimatedStyleBox      useAnimatedStyle  left     commit
//   freezeCssAnimationFadeBox   CSS animation     opacity  CSS loop -> commit
//   freezeCssTransitionFadeBox  CSS transition    opacity  Core Animation / ObjectAnimator
//   freezeAnimatedStyleFadeBox  useAnimatedStyle  opacity  commit (synchronous path when on)
//
// `left` stands in for the screen's unreadable `translateX` on the layout path,
// `opacity` on the non-layout one; no box mixes them. `left` is read from the
// ShadowTree, `opacity` from the mounted view. On iOS both hold a platform
// transition's target, so its fade box is only checked once settled.
//
// Presses call `controls`, because ReJest cannot tap.

// Long enough that the boxes are still moving after a three-screen round trip.
export const DEMO_DURATION_MS = 6000;

// Half the animation: past halfway after the thaw, with room left for
// navigation before the boxes finish.
export const FREEZE_MS = 3000;

// Enough to tell whether state survives.
export const SHORT_FREEZE_MS = 600;

const FROM = 20;
const TO = 200;
const TRAVEL = TO - FROM;

export const FROM_OPACITY = 0;
export const TO_OPACITY = 1;

const SWITCH_DURATION_MS = 300;
const SWITCH_TRAVEL_PX = 20;

// Boxes are compared by progress: 0 at the start value, 1 at the target.

// Reads land a frame or two apart; a restart or a pause is worth 25% or more.
const SPREAD_TOLERANCE = 0.1;

// Slack for re-renders, pushes, pops and re-attaches around a read.
const TIMING_TOLERANCE_MS = 500;
const TIMING_TOLERANCE = TIMING_TOLERANCE_MS / DEMO_DURATION_MS;

// 1px of `left`; an exact float for `opacity`.
const END_TOLERANCE = 1 / TRAVEL;

const HALFWAY = 0.5;

// Effect-started boxes would start at the thaw if hidden first, so every case
// waits for all boxes to move.
const BOX_START_PROGRESS = 0.01;
const BOX_START_TIMEOUT_MS = 2000;

export const ALIGNMENT_WATCH_MS = 400;
const ALIGNMENT_SAMPLE_FRAMES = 3;

// A thaw re-commits the first render's cached style for a frame.
const THAW_SETTLE_FRAMES = 3;

const REATTACH_TIMEOUT_MS = 3000;
const CONTROL_TIMEOUT_MS = 5000;

const CSS_ANIMATION_REF = 'freezeCssAnimationBox';
const CSS_TRANSITION_REF = 'freezeCssTransitionBox';
const ANIMATED_STYLE_REF = 'freezeAnimatedStyleBox';
const CSS_ANIMATION_FADE_REF = 'freezeCssAnimationFadeBox';
export const CSS_TRANSITION_FADE_REF = 'freezeCssTransitionFadeBox';
const ANIMATED_STYLE_FADE_REF = 'freezeAnimatedStyleFadeBox';
export const SWITCH_REF = 'freezeSwitchToggle';

type Box = { name: string; prop: 'left' | 'opacity' };

/** Whether the fade transition runs on the platform, not the CSS loop. */
export const PLATFORM_TRANSITIONS = getStaticFeatureFlag(
  Platform.OS === 'ios'
    ? 'IOS_CSS_CORE_ANIMATION'
    : 'ANDROID_CSS_PLATFORM_TRANSITIONS'
);

/** Only Core Animation hides a transition's progress from every reader. */
const CAN_TRACK_TRANSITION_FADE =
  Platform.OS !== 'ios' || !PLATFORM_TRANSITIONS;

const TRANSITION_FADE_BOX: Box = {
  name: CSS_TRANSITION_FADE_REF,
  prop: 'opacity',
};

/** Boxes whose progress is readable on this platform. */
const TRACKED_BOXES: readonly Box[] = [
  { name: CSS_ANIMATION_REF, prop: 'left' },
  { name: CSS_TRANSITION_REF, prop: 'left' },
  { name: ANIMATED_STYLE_REF, prop: 'left' },
  { name: CSS_ANIMATION_FADE_REF, prop: 'opacity' },
  { name: ANIMATED_STYLE_FADE_REF, prop: 'opacity' },
  ...(CAN_TRACK_TRANSITION_FADE ? [TRANSITION_FADE_BOX] : []),
];

/** Every box, for checks that only need the end state. */
const ALL_BOXES: readonly Box[] = CAN_TRACK_TRANSITION_FADE
  ? TRACKED_BOXES
  : [...TRACKED_BOXES, TRANSITION_FADE_BOX];

// Checks report strings, so a failure names the offending boxes.
export const ALIGNED = 'aligned';
export const IN_RANGE = 'in range';
export const ON_TIME = 'on time';
const ALL_STARTED = 'all started';
export const NO_LEAKS = 'no leaks';

// A freeze runs no cleanup; only a second construction reveals a teardown.
export const SUBTREE_CONSTRUCTED = 'freezeSubtreeConstructed';

const SWITCH_TOGGLE = 'switch/toggle';
const HOME_TO_SCREEN_1 = 'home/goToScreen1';
export const SCREEN_1_TO_SCREEN_2 = 'screen1/goToScreen2';
export const SCREEN_2_TO_SCREEN_3 = 'screen2/goToScreen3';
const BACK_BUTTONS = ['screen3/goBack', 'screen2/goBack', 'screen1/goBack'];

/** Doubles as a mount record: a key appears on mount and drops on unmount. */
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

export async function waitForControl(
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

export async function press(name: string) {
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

/** The mounted view's `opacity`; `null` until a thawed view is re-attached. */
export async function readMountedOpacity(
  name: string,
  timeoutMs = REATTACH_TIMEOUT_MS
) {
  const deadline = performance.now() + timeoutMs;

  do {
    const mounted = await getTestComponent(name).getMountedViewProps();

    if (mounted !== null) {
      return mounted.opacity;
    }
    await waitForFrames(1);
  } while (performance.now() < deadline);

  throw new Error(
    `'${name}' was not attached to a window within ${timeoutMs}ms`
  );
}

async function readProgress({ name, prop }: Box) {
  if (prop === 'left') {
    return ((await readLeft(name)) - FROM) / TRAVEL;
  }

  return (
    ((await readMountedOpacity(name)) - FROM_OPACITY) /
    (TO_OPACITY - FROM_OPACITY)
  );
}

/** A missing tag means frozen; other read failures throw. */
export async function isAttached(name: string) {
  const component = getTestComponent(name);

  if (component.getTag() === -1) {
    return false;
  }

  await component.getAnimatedStyle('left');

  return true;
}

type Reading = {
  names: readonly string[];
  /** Progress per box: 0 at its start value, 1 at its target. */
  values: number[];
  at: number;
};

export async function readBoxes(
  boxes: readonly Box[] = TRACKED_BOXES
): Promise<Reading> {
  const values = await Promise.all(boxes.map(readProgress));

  return {
    names: boxes.map(({ name }) => name),
    values,
    at: performance.now(),
  };
}

function percent(progress: number) {
  return `${(progress * 100).toFixed(1)}%`;
}

export function alignmentReport({ names, values }: Reading) {
  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= SPREAD_TOLERANCE) {
    return ALIGNED;
  }

  const positions = names
    .map((name, index) => `${name}=${percent(values[index])}`)
    .join(', ');

  return `${positions} - spread ${percent(spread)}, tolerated ${percent(SPREAD_TOLERANCE)}`;
}

function rangeReport({ names, values }: Reading, min: number, max: number) {
  const outside = names
    .map((name, index) => ({ name, value: values[index] }))
    .filter(({ value }) => value < min || value > max);

  if (outside.length === 0) {
    return IN_RANGE;
  }

  return outside
    .map(({ name, value }) => `${name}=${percent(value)}`)
    .join(', ')
    .concat(` - outside [${percent(min)}, ${percent(max)}]`);
}

/** The freeze took more than half the animation, and it is not done yet. */
export function pastHalfwayReport(reading: Reading) {
  return rangeReport(reading, HALFWAY, 1 - END_TOLERANCE);
}

function finishedReport(reading: Reading) {
  return rangeReport(reading, 1 - END_TOLERANCE, 1 + END_TOLERANCE);
}

/** Samples a window, to tell a drifting box from a late read. */
export async function worstAlignmentReport(
  durationMs: number,
  boxes: readonly Box[] = TRACKED_BOXES
) {
  const deadline = performance.now() + durationMs;
  let worstSpread = 0;
  let report = ALIGNED;

  do {
    const reading = await readBoxes(boxes);
    const spread = Math.max(...reading.values) - Math.min(...reading.values);

    if (spread > worstSpread) {
      worstSpread = spread;
      report = alignmentReport(reading);
    }

    await waitForFrames(ALIGNMENT_SAMPLE_FRAMES);
  } while (performance.now() < deadline);

  return report;
}

/** Also rejects a box that reads its target already: its reader is blind. */
async function startedReport(
  boxes: readonly Box[] = TRACKED_BOXES,
  timeoutMs = BOX_START_TIMEOUT_MS
) {
  const deadline = performance.now() + timeoutMs;
  let values = (await readBoxes(boxes)).values;

  while (
    values.some((value) => value < BOX_START_PROGRESS) &&
    performance.now() < deadline
  ) {
    await waitForFrames(1);
    values = (await readBoxes(boxes)).values;
  }

  const stalled = boxes
    .filter((_, index) => values[index] < BOX_START_PROGRESS)
    .map(({ name }) => `${name} still at its start after ${timeoutMs}ms`);
  const atTarget = boxes
    .filter((_, index) => values[index] >= 1 - END_TOLERANCE)
    .map(({ name }) => `${name} reads its target already`);
  const problems = [...stalled, ...atTarget];

  return problems.length === 0 ? ALL_STARTED : problems.join(', ');
}

/** A paused box travels ~0, a restarted one goes negative. */
export function travelReport(before: Reading, after: Reading): string {
  const elapsedMs = after.at - before.at;
  const nominal = elapsedMs / DEMO_DURATION_MS;

  const offenders = after.names
    .map((name, index) => ({
      name,
      travel: after.values[index] - before.values[index],
      // Capped for a box that finished mid-window.
      expected: Math.min(nominal, 1 - before.values[index]),
    }))
    .filter(
      ({ travel, expected }) => Math.abs(travel - expected) > TIMING_TOLERANCE
    );

  if (offenders.length === 0) {
    return ON_TIME;
  }

  return offenders
    .map(
      ({ name, travel, expected }) =>
        `${name} moved ${percent(travel)}, expected ${percent(expected)}`
    )
    .join(', ')
    .concat(` in ${elapsedMs.toFixed(0)}ms (±${percent(TIMING_TOLERANCE)})`);
}

export function leakingRegistries() {
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

export async function expectAllBoxesToFinish(
  boxes: readonly Box[] = ALL_BOXES
) {
  await expectEventually(
    async () => finishedReport(await readBoxes(boxes)),
    DEMO_DURATION_MS + 1000
  ).toBe(IN_RANGE);
}

// --- The subtree under test ---

const AnimatedSwitch = () => {
  const ref = useTestRef(SWITCH_REF);
  const isOn = useSharedValue(false);

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

const CSSAnimation = ({ name, fade }: { name: string; fade: boolean }) => {
  const ref = useTestRef(name);

  return (
    <Animated.View
      ref={ref}
      style={fade ? styles.fadeAnimationBox : styles.animationBox}
    />
  );
};

const CSSTransition = ({ name, fade }: { name: string; fade: boolean }) => {
  const ref = useTestRef(name);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setTimeout(() => setStarted(true));
  }, []);

  return (
    <Animated.View
      ref={ref}
      style={
        fade
          ? [
              styles.fadeTransitionBox,
              { opacity: started ? TO_OPACITY : FROM_OPACITY },
            ]
          : [styles.transitionBox, { left: started ? TO : FROM }]
      }
    />
  );
};

const AnimatedStyleAnimation = ({
  name,
  fade,
}: {
  name: string;
  fade: boolean;
}) => {
  const ref = useTestRef(name);
  const started = useSharedValue(false);

  useEffect(() => {
    started.set(true);
  }, [started]);

  const animatedStyle = useAnimatedStyle(() => {
    const config = { duration: DEMO_DURATION_MS, easing: Easing.linear };

    return fade
      ? {
          opacity: withTiming(
            started.get() ? TO_OPACITY : FROM_OPACITY,
            config
          ),
        }
      : { left: withTiming(started.get() ? TO : FROM, config) };
  });

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
        <CSSAnimation name={CSS_ANIMATION_REF} fade={false} />
        <CSSTransition name={CSS_TRANSITION_REF} fade={false} />
        <AnimatedStyleAnimation name={ANIMATED_STYLE_REF} fade={false} />
        <CSSAnimation name={CSS_ANIMATION_FADE_REF} fade />
        <CSSTransition name={CSS_TRANSITION_FADE_REF} fade />
        <AnimatedStyleAnimation name={ANIMATED_STYLE_FADE_REF} fade />
      </View>
    </Freeze>
  );
}

// --- Environment 1: the fixture on its own, frozen by a prop ---

function PlainFixture({ frozen }: { frozen: boolean }) {
  return <FreezeFixture frozen={frozen} />;
}

// --- Environment 2: the fixture inside the example screen's native stack ---

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

  return (
    <View style={styles.container}>
      <Text>Screen 1</Text>
    </View>
  );
}

function Screen2() {
  const navigation = useNavigation<StackNavigation>();

  useControl(SCREEN_2_TO_SCREEN_3, () => navigation.navigate('screen3'));
  useControl('screen2/goBack', () => navigation.goBack());

  return (
    <View style={styles.container}>
      <Text>Screen 2</Text>
    </View>
  );
}

function Screen3() {
  const navigation = useNavigation<StackNavigation>();

  useControl('screen3/goBack', () => navigation.goBack());

  return (
    <View style={styles.container}>
      <Text>Screen 3</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<StackParamList>();

function NavigatorFixture() {
  return (
    // Keeps working if the runtime-tests host ever grows its own container.
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
export async function goHome() {
  for (const button of BACK_BUTTONS) {
    if (button in controls) {
      await press(button);
      await waitForControl(button, false);
    }
  }

  // Effects stay registered while hidden, so only a read signals the thaw.
  await readLeft(SWITCH_REF);

  // Here, not in the driver: deep-stack cases pop through `goHome`.
  await waitForFrames(THAW_SETTLE_FRAMES);
}

/**
 * Turns the switch on, runs `freezeAndThaw`, and checks the switch is still on
 * in the same subtree and still toggles off.
 */
export async function expectSwitchToSurvive(
  freezeAndThaw: () => Promise<void>
) {
  // `left` is the frame origin, so `off` is the container padding.
  const off = await readLeft(SWITCH_REF);
  const on = off + SWITCH_TRAVEL_PX;

  await press(SWITCH_TOGGLE);
  await expectEventually(
    () => readLeft(SWITCH_REF),
    SWITCH_DURATION_MS + 1000
  ).toBeWithinRange(on - 1, on + 1);

  await freezeAndThaw();

  // A rebuilt subtree would be back at `off`.
  await expectEventually(
    () => readLeft(SWITCH_REF),
    REATTACH_TIMEOUT_MS
  ).toBeWithinRange(on - 1, on + 1);

  expect(await getTrackerCallCount(SUBTREE_CONSTRUCTED)).toBeCalledJS(1);

  await press(SWITCH_TOGGLE);
  await expectEventually(
    () => readLeft(SWITCH_REF),
    SWITCH_DURATION_MS + 1000
  ).toBeWithinRange(off - 1, off + 1);
}

// --- Drivers - the only thing that differs between the two environments ---

export type Driver = {
  name: string;
  mount: () => Promise<void>;
  freeze: () => Promise<void>;
  thaw: () => Promise<void>;
};

export const plainDriver: Driver = {
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

export const navigatorDriver: Driver = {
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

// --- Cases that run in both environments - only the driver differs ---

export function describeSharedCases(driver: Driver) {
  describe(`react-freeze *${driver.name}*`, () => {
    test('animations keep running while the subtree is frozen', async () => {
      await driver.mount();
      expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);

      const before = await readBoxes();

      await driver.freeze();
      await wait(FREEZE_MS);
      await driver.thaw();

      const after = await readBoxes();

      expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);

      expect(pastHalfwayReport(after)).toBe(IN_RANGE);
      expect(travelReport(before, after)).toBe(ON_TIME);

      await expectAllBoxesToFinish();
    });

    test('the switch keeps its state across a freeze', async () => {
      await driver.mount();
      await expectSwitchToSurvive(async () => {
        await driver.freeze();
        await wait(SHORT_FREEZE_MS);
        await driver.thaw();
      });
    });

    test('holds the finished state across a freeze', async () => {
      await driver.mount();
      await expectAllBoxesToFinish();

      await driver.freeze();
      await wait(SHORT_FREEZE_MS);
      await driver.thaw();

      // `animationFillMode: 'both'` and the settled transition both survive.
      const settled = await readBoxes(ALL_BOXES);
      expect(alignmentReport(settled)).toBe(ALIGNED);
      expect(finishedReport(settled)).toBe(IN_RANGE);
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

const BOX_SIZE = { width: 100, height: 50 };

const styles = css.create({
  container: {
    flex: 1,
    // Left-aligned so `left` reads as the raw frame origin.
    alignItems: 'flex-start',
    rowGap: 20,
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
    ...BOX_SIZE,
    backgroundColor: 'green',
    animationDuration: DEMO_DURATION_MS,
    animationFillMode: 'both',
    animationTimingFunction: 'linear',
    animationName: {
      from: { left: FROM },
      to: { left: TO },
    },
  },
  fadeAnimationBox: {
    ...BOX_SIZE,
    backgroundColor: 'green',
    animationDuration: DEMO_DURATION_MS,
    animationFillMode: 'both',
    animationTimingFunction: 'linear',
    animationName: {
      from: { opacity: FROM_OPACITY },
      to: { opacity: TO_OPACITY },
    },
  },
  transitionBox: {
    ...BOX_SIZE,
    backgroundColor: 'blue',
    transitionDuration: DEMO_DURATION_MS,
    transitionProperty: 'left',
    transitionTimingFunction: 'linear',
  },
  // Linear easing and no callbacks keep this on the platform path.
  fadeTransitionBox: {
    ...BOX_SIZE,
    backgroundColor: 'blue',
    transitionDuration: DEMO_DURATION_MS,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'linear',
  },
  box: {
    ...BOX_SIZE,
    backgroundColor: 'pink',
  },
});
