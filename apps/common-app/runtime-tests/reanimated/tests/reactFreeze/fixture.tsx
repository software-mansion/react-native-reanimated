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
import { Text, View } from 'react-native';
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
// test, in two environments: frozen by a prop (`propDriven.test.tsx`), and
// frozen the way the screen does it, by pushing a native stack screen
// (`nativeStack.test.tsx`). This module holds the fixture, the drivers and the
// cases both environments share.
//
// `<Freeze>` is the only freezing in either one. Navigation does not freeze by
// itself - react-native-screens defaults `freezeOnBlur` to `freezeEnabled()`,
// which stays `false` until an app calls `enableFreeze()`, and nothing here
// does.
//
// The boxes animate `left` where the screen animates `translateX`, because
// `getViewProp` serves eight props and no transform. Presses are function calls
// through `controls`, because ReJest cannot tap.

export const DEMO_DURATION_MS = 4000;

// Has to dominate the run, or a case measures what happens around the freeze
// rather than during it: ~55% of the animation, ~70% once a push and a pop are
// added.
export const FREEZE_MS = 2200;

// State either survives the hide or it does not; no need for a long freeze.
export const SHORT_FREEZE_MS = 600;

const FROM = 20;
export const TO = 200;
const TRAVEL = TO - FROM;
export const MIDPOINT = (FROM + TO) / 2;

const SWITCH_DURATION_MS = 300;
const SWITCH_TRAVEL_PX = 20;

// Reads land a frame or two apart, so a few px of spread is normal; a restart
// or a pause is worth 50px or more.
const SPREAD_TOLERANCE_PX = 20;

// Slack for what a re-render, a push, a pop and a re-attach add around a read.
const TIMING_TOLERANCE_MS = 500;
const TIMING_TOLERANCE_PX = (TIMING_TOLERANCE_MS / DEMO_DURATION_MS) * TRAVEL;

// Two boxes start from an effect, and an effect that has not reached the UI
// runtime before the hide starts at the thaw instead - so every case waits for
// all three to be moving first.
const BOX_START_PX = 2;
const BOX_START_TIMEOUT_MS = 2000;

export const ALIGNMENT_WATCH_MS = 400;
const ALIGNMENT_SAMPLE_FRAMES = 3;

// Showing the subtree again re-commits the host views with the style
// `PropsFilter` cached on the first render - `left: FROM` here. The next frame
// overwrites it, so a read taken too early measures the re-commit.
const THAW_SETTLE_FRAMES = 3;

const REATTACH_TIMEOUT_MS = 3000;
const CONTROL_TIMEOUT_MS = 5000;

const CSS_ANIMATION_REF = 'freezeCssAnimationBox';
const CSS_TRANSITION_REF = 'freezeCssTransitionBox';
const ANIMATED_STYLE_REF = 'freezeAnimatedStyleBox';
export const SWITCH_REF = 'freezeSwitchToggle';

const BOX_REFS = [CSS_ANIMATION_REF, CSS_TRANSITION_REF, ANIMATED_STYLE_REF];

// Every check reports a string, so ReJest's `Expected <x> received <y>` names
// the offending boxes instead of comparing against an empty string.
export const ALIGNED = 'aligned';
export const IN_RANGE = 'in range';
export const ON_TIME = 'on time';
const ALL_STARTED = 'all started';
export const NO_LEAKS = 'no leaks';

// React leaves a hidden subtree's effects connected, so no cleanup fires for a
// freeze and only a second construction distinguishes one from a teardown.
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

/**
 * A missing tag is the signature of a freeze; any other read failure is left to
 * throw rather than reported as one.
 */
export async function isAttached(name: string) {
  const component = getTestComponent(name);

  if (component.getTag() === -1) {
    return false;
  }

  await component.getAnimatedStyle('left');

  return true;
}

type Reading = {
  refs: readonly string[];
  values: number[];
  at: number;
};

export async function readBoxes(
  refs: readonly string[] = BOX_REFS
): Promise<Reading> {
  const values = await Promise.all(refs.map((name) => readLeft(name)));

  return { refs, values, at: performance.now() };
}

export function alignmentReport({ refs, values }: Reading) {
  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= SPREAD_TOLERANCE_PX) {
    return ALIGNED;
  }

  const positions = refs
    .map((name, index) => `${name}=${values[index].toFixed(1)}`)
    .join(', ');

  return `${positions} - spread ${spread.toFixed(1)}px, tolerated ${SPREAD_TOLERANCE_PX}px`;
}

export function rangeReport(
  { refs, values }: Reading,
  min: number,
  max: number
) {
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

/** A window of samples is what tells a drifting box from a late-read one. */
export async function worstAlignmentReport(
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

/** A paused clock reports ~0 travel here, a restarted one a large negative. */
export function travelReport(before: Reading, after: Reading): string {
  const elapsedMs = after.at - before.at;
  const nominal = (elapsedMs / DEMO_DURATION_MS) * TRAVEL;

  const offenders = after.refs
    .map((name, index) => ({
      name,
      travel: after.values[index] - before.values[index],
      // A box that reached `TO` mid-window cannot have travelled it all.
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
  refs: readonly string[] = BOX_REFS
) {
  await expectEventually(
    async () => rangeReport(await readBoxes(refs), TO - 1, TO + 1),
    DEMO_DURATION_MS + 1000
  ).toBe(IN_RANGE);
}

// --- The subtree under test - the example screen's four animated pieces ---

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
  const target = useSharedValue(FROM);

  useEffect(() => {
    target.set(TO);
  }, [target]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: withTiming(target.get(), {
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

  // A control key cannot gate on the thaw: effects stay registered while
  // hidden, so a successful read is the only signal.
  await readLeft(SWITCH_REF);

  // Settles here, not in the driver: the deep-stack cases pop through `goHome`.
  await waitForFrames(THAW_SETTLE_FRAMES);
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

      // Past the midpoint: the freeze cost more than half of the animation.
      expect(rangeReport(after, MIDPOINT, TO - 1)).toBe(IN_RANGE);
      expect(travelReport(before, after)).toBe(ON_TIME);

      await expectAllBoxesToFinish();
    });

    test('the switch keeps its state across a freeze', async () => {
      await driver.mount();

      // `left` is the Yoga frame origin, so resting is the container padding.
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

      // A subtree that had been torn down and rebuilt would be back at `off`.
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
    });

    test('holds the finished state across a freeze', async () => {
      await driver.mount();
      await expectAllBoxesToFinish();

      await driver.freeze();
      await wait(SHORT_FREEZE_MS);
      await driver.thaw();

      // `animationFillMode: 'both'` and the settled transition both survive.
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

const styles = css.create({
  container: {
    flex: 1,
    // Left-aligned so `left` reads as the raw frame origin.
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
