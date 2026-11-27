import type { ComponentRef, ReactNode } from 'react';
import { forwardRef, useCallback, useEffect } from 'react';
import type { ViewProps, ViewStyle } from 'react-native';
import { findNodeHandle, StyleSheet, View } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { runOnUISync, scheduleOnUI } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

// One useAnimatedStyle shared by views that mount at different times (#2851).
// A late view shows the current width, the React commit does not revert views
// already mounted (also after the settled sync-back), and later animations
// reach every view. A late view is full width on each of its first frames on
// screen, read from the mounted view every frame. The easing is not covered.

const ALWAYS_REF = 'SHARED_STYLE_ALWAYS';
const TOGGLED_REF = 'SHARED_STYLE_TOGGLED';
const SCOPED_REF = 'SHARED_STYLE_SCOPED';
const counterRef = (index: number) => `SHARED_STYLE_COUNTER_${index}`;
const storedRef = (index: number) => `SHARED_STYLE_STORED_${index}`;
/** One color per way a view is added, to tell them apart on screen. */
const COLORS = {
  always: 'orange',
  toggled: 'black',
  counter: 'blue',
  stored: 'green',
};

const INITIAL_WIDTH = 100;
const FIRST_WIDTH = 250;
const SECOND_WIDTH = 180;
const THIRD_WIDTH = 220;
const FOURTH_WIDTH = 140;
const DURATION_MS = 300;
/**
 * Frames for the React commit, the native mount and one mapper run, with slack
 * for a dropped frame.
 */
const FRAMES_AFTER_MOUNT = 5;
/** Frames on screen recorded for each late view, starting with its first one. */
const RECORDED_FRAMES = 5;

/** Written in an effect, called by the test. Reset in beforeEach. */
let setWidth: (width: number) => void = () => {};
/** The width React last passed to the always-mounted view. Reset in beforeEach. */
let reactWidthOfAlwaysView: number | undefined;
/**
 * Elements created once, with the style of the render that first needed them,
 * and reused in later renders. Reset in beforeEach.
 */
const storedViews = new Map<number, ReactNode>();

type ScenarioState = { toggled: boolean; counter: number; stored: number };
type FirstFrames = Record<string, { tag: number; widths: number[] }>;
/** Recorded on the UI runtime, read with runOnUISync, as in scrollDrivenStyle. */
type FirstFramesGlobal = typeof globalThis & {
  __sharedStyleFirstFrames?: FirstFrames;
};

type ReportingViewProps = ViewProps & { onStyle?: (style: ViewStyle) => void };

/** Reports the style React passes to it, so the test sees the settled sync-back. */
const ReportingView = forwardRef<ComponentRef<typeof View>, ReportingViewProps>(
  ({ onStyle, ...props }, ref) => {
    onStyle?.(StyleSheet.flatten(props.style) ?? {});
    return <View ref={ref} {...props} />;
  }
);

const AnimatedReportingView = Animated.createAnimatedComponent(ReportingView);

/** Every view except the always-mounted one records its first frames. */
function SharedBox({
  name,
  animatedStyle,
  color,
  onStyle,
}: {
  name: string;
  animatedStyle: AnimatedStyle<ViewStyle>;
  color: string;
  onStyle?: (style: ViewStyle) => void;
}) {
  const testRef = useTestRef(name);
  const isLate = name !== ALWAYS_REF;
  const setRef = useCallback(
    (view: ComponentRef<typeof AnimatedReportingView> | null) => {
      testRef.current = view;
      const tag = findNodeHandle(view);
      if (isLate && typeof tag === 'number') {
        startRecording(name, tag);
      }
    },
    [testRef, name, isLate]
  );
  return (
    <AnimatedReportingView
      ref={setRef}
      collapsable={false}
      onStyle={onStyle}
      style={[styles.box, { backgroundColor: color }, animatedStyle]}
    />
  );
}

function reportAlwaysViewStyle(style: ViewStyle) {
  reactWidthOfAlwaysView =
    typeof style.width === 'number' ? style.width : undefined;
}

function Scenario({ toggled, counter, stored }: ScenarioState) {
  const width = useSharedValue(INITIAL_WIDTH);

  useEffect(() => {
    setWidth = (value) => {
      width.value = value;
    };
  }, [width]);

  const style = useAnimatedStyle(() => ({
    width: withTiming(width.value, { duration: DURATION_MS }),
  }));

  // Runs from the first render, so a late view is sampled from the frame its
  // ref reports it, before the test reads anything.
  useFrameCallback(() => {
    const views = (globalThis as FirstFramesGlobal).__sharedStyleFirstFrames;
    if (!views) {
      return;
    }
    for (const name of Object.keys(views)) {
      const view = views[name];
      if (view.widths.length < RECORDED_FRAMES) {
        const props = global._obtainMountedViewProps(view.tag, false);
        if (props) {
          view.widths.push(props.width);
        }
      }
    }
  });

  for (let index = 0; index < stored; index++) {
    if (!storedViews.has(index)) {
      storedViews.set(
        index,
        <SharedBox
          key={storedRef(index)}
          name={storedRef(index)}
          animatedStyle={style}
          color={COLORS.stored}
        />
      );
    }
  }
  // Created before the JSX, rendered only while toggled on.
  const scopedView = (
    <SharedBox name={SCOPED_REF} animatedStyle={style} color={COLORS.toggled} />
  );

  return (
    <View style={styles.container}>
      <SharedBox
        name={ALWAYS_REF}
        animatedStyle={style}
        color={COLORS.always}
        onStyle={reportAlwaysViewStyle}
      />
      {toggled && (
        <SharedBox
          name={TOGGLED_REF}
          animatedStyle={style}
          color={COLORS.toggled}
        />
      )}
      {toggled && scopedView}
      {Array.from({ length: counter }, (_, index) => (
        <SharedBox
          key={counterRef(index)}
          name={counterRef(index)}
          animatedStyle={style}
          color={COLORS.counter}
        />
      ))}
      {Array.from({ length: stored }, (_, index) => storedViews.get(index))}
    </View>
  );
}

function mountedRefs({ toggled, counter, stored }: ScenarioState) {
  return [
    ALWAYS_REF,
    ...(toggled ? [TOGGLED_REF, SCOPED_REF] : []),
    ...Array.from({ length: counter }, (_, index) => counterRef(index)),
    ...Array.from({ length: stored }, (_, index) => storedRef(index)),
  ];
}

async function readShadowTreeWidth(ref: string) {
  return Number(await getTestComponent(ref).getAnimatedStyle('width'));
}

async function readMountedWidth(ref: string) {
  return (await getTestComponent(ref).getMountedViewProps())?.width;
}

async function expectShadowTreeWidths(state: ScenarioState, width: number) {
  for (const ref of mountedRefs(state)) {
    expect(await readShadowTreeWidth(ref)).toBe(width, ComparisonMode.PIXEL);
  }
}

async function expectAllWidths(state: ScenarioState, width: number) {
  for (const ref of mountedRefs(state)) {
    expect(await readShadowTreeWidth(ref)).toBe(width, ComparisonMode.PIXEL);
    expect(await readMountedWidth(ref)).toBe(width, ComparisonMode.PIXEL);
  }
}

function startRecording(name: string, tag: number) {
  scheduleOnUI(() => {
    'worklet';
    const global = globalThis as FirstFramesGlobal;
    global.__sharedStyleFirstFrames ??= {};
    global.__sharedStyleFirstFrames[name] = { tag, widths: [] };
  });
}

function readFirstFrames(name: string) {
  return runOnUISync(() => {
    'worklet';
    const views = (globalThis as FirstFramesGlobal).__sharedStyleFirstFrames;
    return [...(views?.[name]?.widths ?? [])];
  });
}

function resetFirstFrames() {
  runOnUISync(() => {
    'worklet';
    (globalThis as FirstFramesGlobal).__sharedStyleFirstFrames = {};
  });
}

/** A late view must have the full width on every recorded frame, not only later. */
async function expectFirstFramesAt(refs: string[], width: number) {
  for (const ref of refs) {
    await expectEventually(() => readFirstFrames(ref).length).toBe(
      RECORDED_FRAMES,
      ComparisonMode.NUMBER
    );
    for (const frameWidth of readFirstFrames(ref)) {
      expect(frameWidth).toBe(width, ComparisonMode.PIXEL);
    }
  }
}

/**
 * Renders the state and checks the shadow tree right away, then the first
 * frames on screen of the views that mounted, then every view.
 */
async function renderAndExpectWidths(
  state: ScenarioState,
  width: number,
  previous?: ScenarioState
) {
  const before = previous ? mountedRefs(previous) : [];
  const mountedNow = mountedRefs(state).filter(
    (ref) => ref !== ALWAYS_REF && !before.includes(ref)
  );
  await render(<Scenario {...state} />);
  await expectShadowTreeWidths(state, width);
  await expectFirstFramesAt(mountedNow, width);
  await waitForFrames(FRAMES_AFTER_MOUNT);
  await expectAllWidths(state, width);
}

/** Changes the value without a React render and waits until every view has it. */
async function animateTo(state: ScenarioState, width: number) {
  setWidth(width);
  for (const ref of mountedRefs(state)) {
    await expectEventually(() => readMountedWidth(ref)).toBe(
      width,
      ComparisonMode.PIXEL
    );
  }
  await expectAllWidths(state, width);
}

describe('animated style shared by views that mount at different times', () => {
  beforeEach(() => {
    setWidth = () => {};
    resetFirstFrames();
    reactWidthOfAlwaysView = undefined;
    storedViews.clear();
  });

  test.each([
    { description: 'before the settled value reaches React', syncBack: false },
    { description: 'after the settled value reaches React', syncBack: true },
  ])(
    'views that mount ${description} get the current width and follow later animations',
    async ({ syncBack }) => {
      const initial = { toggled: false, counter: 0, stored: 0 };
      await renderAndExpectWidths(initial, INITIAL_WIDTH);
      await animateTo(initial, FIRST_WIDTH);

      if (syncBack) {
        // PropsRegistryGarbageCollector passes the settled width to React.
        await expectEventually(() => reactWidthOfAlwaysView).toBe(
          FIRST_WIDTH,
          ComparisonMode.PIXEL
        );
      } else {
        // The value settles SETTLED_ANIMATION_THRESHOLD_MS (1000 ms) after the
        // animation ends, so React still has the initial width here.
        expect(reactWidthOfAlwaysView).toBe(
          INITIAL_WIDTH,
          ComparisonMode.PIXEL
        );
      }

      // Every kind of late view mounts at once.
      const firstMount = { toggled: true, counter: 1, stored: 1 };
      await renderAndExpectWidths(firstMount, FIRST_WIDTH, initial);
      await animateTo(firstMount, SECOND_WIDTH);

      // The toggled views unmount while more views mount.
      const secondMount = { toggled: false, counter: 2, stored: 2 };
      await renderAndExpectWidths(secondMount, SECOND_WIDTH, firstMount);
      await animateTo(secondMount, THIRD_WIDTH);

      // The toggled views mount again.
      const remount = { toggled: true, counter: 2, stored: 2 };
      await renderAndExpectWidths(remount, THIRD_WIDTH, secondMount);
      await animateTo(remount, FOURTH_WIDTH);
    }
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  box: {
    height: 30,
    width: INITIAL_WIDTH,
    marginVertical: 4,
  },
});
