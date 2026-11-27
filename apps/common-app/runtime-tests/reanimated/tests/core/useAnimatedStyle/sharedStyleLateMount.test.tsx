import type { ComponentRef, ReactNode } from 'react';
import { forwardRef, useEffect } from 'react';
import type { ViewProps, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
// reach every view. Read from the shadow tree (getAnimatedStyle) and the
// mounted view (getMountedViewProps). The easing's look is not covered.

const ALWAYS_REF = 'SHARED_STYLE_ALWAYS';
const TOGGLED_REF = 'SHARED_STYLE_TOGGLED';
const SCOPED_REF = 'SHARED_STYLE_SCOPED';
const counterRef = (index: number) => `SHARED_STYLE_COUNTER_${index}`;
const storedRef = (index: number) => `SHARED_STYLE_STORED_${index}`;

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

type ReportingViewProps = ViewProps & { onStyle?: (style: ViewStyle) => void };

/** Reports the style React passes to it, so the test sees the settled sync-back. */
const ReportingView = forwardRef<ComponentRef<typeof View>, ReportingViewProps>(
  ({ onStyle, ...props }, ref) => {
    onStyle?.(StyleSheet.flatten(props.style) ?? {});
    return <View ref={ref} {...props} />;
  }
);

const AnimatedReportingView = Animated.createAnimatedComponent(ReportingView);

function SharedBox({
  name,
  animatedStyle,
  onStyle,
}: {
  name: string;
  animatedStyle: AnimatedStyle<ViewStyle>;
  onStyle?: (style: ViewStyle) => void;
}) {
  const ref = useTestRef(name);
  return (
    <AnimatedReportingView
      ref={ref}
      collapsable={false}
      onStyle={onStyle}
      style={[styles.box, animatedStyle]}
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

  for (let index = 0; index < stored; index++) {
    if (!storedViews.has(index)) {
      storedViews.set(
        index,
        <SharedBox
          key={storedRef(index)}
          name={storedRef(index)}
          animatedStyle={style}
        />
      );
    }
  }
  // Created before the JSX, rendered only while toggled on.
  const scopedView = <SharedBox name={SCOPED_REF} animatedStyle={style} />;

  return (
    <View style={styles.container}>
      <SharedBox
        name={ALWAYS_REF}
        animatedStyle={style}
        onStyle={reportAlwaysViewStyle}
      />
      {toggled && <SharedBox name={TOGGLED_REF} animatedStyle={style} />}
      {toggled && scopedView}
      {Array.from({ length: counter }, (_, index) => (
        <SharedBox
          key={counterRef(index)}
          name={counterRef(index)}
          animatedStyle={style}
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

/**
 * Renders the state and checks the shadow tree right away. A late view may not
 * be mounted natively yet, so the mounted views are read a few frames later.
 */
async function renderAndExpectWidths(state: ScenarioState, width: number) {
  await render(<Scenario {...state} />);
  await expectShadowTreeWidths(state, width);
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
      await renderAndExpectWidths(firstMount, FIRST_WIDTH);
      await animateTo(firstMount, SECOND_WIDTH);

      // The toggled views unmount while more views mount.
      const secondMount = { toggled: false, counter: 2, stored: 2 };
      await renderAndExpectWidths(secondMount, SECOND_WIDTH);
      await animateTo(secondMount, THIRD_WIDTH);

      // The toggled views mount again.
      const remount = { toggled: true, counter: 2, stored: 2 };
      await renderAndExpectWidths(remount, THIRD_WIDTH);
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
    backgroundColor: 'orange',
  },
});
