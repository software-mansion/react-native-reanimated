/**
 * Battery benchmark scenarios. Every scenario renders `count` boxes in the same
 * grid with the same colors, so the display content stays as close as possible
 * between scenarios and only the animation mechanism changes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import {
  Animated as RNAnimated,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { AnimatedSensor, Value3D } from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  LinearTransition,
  SensorType,
  useAnimatedProps,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

export interface ScenarioProps {
  count: number;
  size: number;
}

const DURATION = 1000;
const DISTANCE = 20;
const BOX_COLOR = '#5b8def';
const BOX_COLOR_2 = '#ef8d5b';

const linear = { duration: DURATION, easing: Easing.linear };
const rnLinear = (t: number) => t;

function boxStyle(size: number): ViewStyle {
  return {
    width: size,
    height: size,
    margin: size * 0.25,
    backgroundColor: BOX_COLOR,
  };
}

function range(count: number) {
  return Array.from({ length: count }, (_, i) => i);
}

// ---------------------------------------------------------------------------
// Baselines
// ---------------------------------------------------------------------------

function Empty() {
  return null;
}

function Static({ count, size }: ScenarioProps) {
  return range(count).map((i) => <View key={i} style={boxStyle(size)} />);
}

/** Mounted useAnimatedStyle whose shared value never changes. */
function UasIdleItem({ size }: { size: number }) {
  const sv = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.value }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

/** One-shot 1 s animation on mount, idle afterwards. */
function UasFinishedItem({ size }: { size: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withTiming(DISTANCE, linear);
  }, [sv]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.value }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

// ---------------------------------------------------------------------------
// Non-Reanimated references
// ---------------------------------------------------------------------------

function RNAnimatedNativeItem({ size }: { size: number }) {
  const value = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(value, {
          toValue: DISTANCE,
          duration: DURATION,
          easing: rnLinear,
          useNativeDriver: true,
        }),
        RNAnimated.timing(value, {
          toValue: 0,
          duration: DURATION,
          easing: rnLinear,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [value]);
  return (
    <RNAnimated.View
      style={[boxStyle(size), { transform: [{ translateX: value }] }]}
    />
  );
}

/** RequestAnimationFrame + setState: the "don't do this" reference. */
function JsRaf({ count, size }: ScenarioProps) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let id = 0;
    const start = performance.now();
    const loop = () => {
      setT(performance.now() - start);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const phase = (t % (2 * DURATION)) / DURATION;
  const x = (phase < 1 ? phase : 2 - phase) * DISTANCE;
  return range(count).map((i) => (
    <View
      key={i}
      style={[boxStyle(size), { transform: [{ translateX: x }] }]}
    />
  ));
}

// ---------------------------------------------------------------------------
// Shared values + useAnimatedStyle
// ---------------------------------------------------------------------------

function UasTransformItem({ size }: { size: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withTiming(DISTANCE, linear), -1, true);
  }, [sv]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.value }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

function UasOpacityItem({ size }: { size: number }) {
  const sv = useSharedValue(1);
  useEffect(() => {
    sv.value = withRepeat(withTiming(0.3, linear), -1, true);
  }, [sv]);
  const style = useAnimatedStyle(() => ({ opacity: sv.value }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

function UasColorItem({ size }: { size: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withTiming(1, linear), -1, true);
  }, [sv]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sv.value,
      [0, 1],
      [BOX_COLOR, BOX_COLOR_2]
    ),
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

/** Animates `width`, a layout prop: forces Yoga layout + shadow tree commit. */
function UasLayoutItem({ size }: { size: number }) {
  const sv = useSharedValue(size);
  useEffect(() => {
    sv.value = withRepeat(withTiming(size * 1.4, linear), -1, true);
  }, [sv, size]);
  const style = useAnimatedStyle(() => ({ width: sv.value }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

function UasSpringItem({ size }: { size: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withSpring(DISTANCE), -1, true);
  }, [sv]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.value }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

/** One shared value, `count` mappers (one useAnimatedStyle per box). */
function UasSharedSv({ count, size }: ScenarioProps) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withTiming(DISTANCE, linear), -1, true);
  }, [sv]);
  return range(count).map((i) => (
    <UasSharedSvItem key={i} size={size} sv={sv} />
  ));
}

function UasSharedSvItem({
  size,
  sv,
}: {
  size: number;
  sv: ReturnType<typeof useSharedValue<number>>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.value }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

/** One shared value, one useAnimatedStyle on a common parent. */
function UasParent({ count, size }: ScenarioProps) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withTiming(DISTANCE, linear), -1, true);
  }, [sv]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.value }],
  }));
  return (
    <Animated.View style={[styles.grid, style]}>
      {range(count).map((i) => (
        <View key={i} style={boxStyle(size)} />
      ))}
    </Animated.View>
  );
}

function DerivedChainItem({ size }: { size: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withTiming(1, linear), -1, true);
  }, [sv]);
  const a = useDerivedValue(() => sv.value * 2);
  const b = useDerivedValue(() => a.value * 5);
  const c = useDerivedValue(() => b.value + 0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: c.value }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

/** UseFrameCallback writing `count` shared values every frame. */
function FrameCallback({ count, size }: ScenarioProps) {
  const xs = useSharedValue<number[]>(range(count).map(() => 0));
  useFrameCallback(({ timeSinceFirstFrame }) => {
    const phase = (timeSinceFirstFrame % (2 * DURATION)) / DURATION;
    const x = (phase < 1 ? phase : 2 - phase) * DISTANCE;
    const next = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      next[i] = x;
    }
    xs.value = next;
  });
  return range(count).map((i) => (
    <FrameCallbackItem index={i} key={i} size={size} xs={xs} />
  ));
}

function FrameCallbackItem({
  index,
  size,
  xs,
}: {
  index: number;
  size: number;
  xs: ReturnType<typeof useSharedValue<number[]>>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: xs.value[index] }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

/** A registered, empty frame callback next to static views. */
function FrameCallbackIdle({ count, size }: ScenarioProps) {
  useFrameCallback(() => {
    // intentionally empty
  });
  return <Static count={count} size={size} />;
}

function SensorItem({
  size,
  sensor,
}: {
  size: number;
  sensor: AnimatedSensor<Value3D>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sensor.sensor.value.x * 0.001 }],
  }));
  return <Animated.View style={[boxStyle(size), style]} />;
}

function Sensor({ count, size }: ScenarioProps) {
  const sensor = useAnimatedSensor(SensorType.GYROSCOPE);
  return range(count).map((i) => (
    <SensorItem key={i} sensor={sensor} size={size} />
  ));
}

/** Sensor registered but read by nobody. */
function SensorIdle({ count, size }: ScenarioProps) {
  useAnimatedSensor(SensorType.GYROSCOPE);
  return <Static count={count} size={size} />;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedPropsSvgItem({ size }: { size: number }) {
  const sv = useSharedValue(size * 0.25);
  useEffect(() => {
    sv.value = withRepeat(withTiming(size * 0.5, linear), -1, true);
  }, [sv, size]);
  const props = useAnimatedProps(() => ({ r: sv.value }));
  return (
    <Svg height={size} style={{ margin: size * 0.25 }} width={size}>
      <AnimatedCircle
        animatedProps={props}
        cx={size / 2}
        cy={size / 2}
        fill={BOX_COLOR}
      />
    </Svg>
  );
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function AnimatedPropsTextItem({ size }: { size: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withTiming(100, linear), -1, true);
  }, [sv]);
  const props = useAnimatedProps(() => {
    const text = `${Math.round(sv.value)}`;
    return { text, defaultValue: text } as object;
  });
  return (
    <AnimatedTextInput
      animatedProps={props}
      editable={false}
      style={[boxStyle(size), styles.text, { fontSize: size * 0.4 }]}
    />
  );
}

// ---------------------------------------------------------------------------
// Layout animations
// ---------------------------------------------------------------------------

function useTick(interval: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), interval);
    return () => clearInterval(id);
  }, [interval]);
  return tick;
}

/** Every second half of the boxes is removed (FadeOut) or added (FadeIn). */
function LayoutEnteringExiting({ count, size }: ScenarioProps) {
  const tick = useTick(DURATION);
  return range(count).map((i) =>
    i % 2 === 0 || tick % 2 === 0 ? (
      <Animated.View
        entering={FadeIn.duration(DURATION / 2)}
        exiting={FadeOut.duration(DURATION / 2)}
        key={i}
        style={boxStyle(size)}
      />
    ) : (
      <View key={i} style={boxStyle(size)} />
    )
  );
}

/**
 * Every second the order of boxes is reversed and animated with
 * LinearTransition.
 */
function LayoutTransition({ count, size }: ScenarioProps) {
  const tick = useTick(DURATION);
  const order = tick % 2 === 0 ? range(count) : range(count).reverse();
  return order.map((i) => (
    <Animated.View
      key={i}
      layout={LinearTransition.duration(DURATION / 2)}
      style={[
        boxStyle(size),
        { backgroundColor: i % 2 ? BOX_COLOR : BOX_COLOR_2 },
      ]}
    />
  ));
}

// ---------------------------------------------------------------------------
// CSS animations and transitions
// ---------------------------------------------------------------------------

const cssBase = {
  animationDuration: DURATION,
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'linear',
} as const;

const KEYFRAMES = {
  transform: {
    from: { transform: [{ translateX: 0 }] },
    to: { transform: [{ translateX: DISTANCE }] },
  },
  opacity: { from: { opacity: 1 }, to: { opacity: 0.3 } },
  color: {
    from: { backgroundColor: BOX_COLOR },
    to: { backgroundColor: BOX_COLOR_2 },
  },
} as const;

function cssAnimation(kind: keyof typeof KEYFRAMES) {
  return function CssAnimation({ count, size }: ScenarioProps) {
    return range(count).map((i) => (
      <Animated.View
        key={i}
        style={[boxStyle(size), { ...cssBase, animationName: KEYFRAMES[kind] }]}
      />
    ));
  };
}

function CssAnimationLayout({ count, size }: ScenarioProps) {
  const keyframes = useMemo(
    () => ({ from: { width: size }, to: { width: size * 1.4 } }),
    [size]
  );
  return range(count).map((i) => (
    <Animated.View
      key={i}
      style={[boxStyle(size), { ...cssBase, animationName: keyframes }]}
    />
  ));
}

/** State flips every DURATION; each flip starts a DURATION-long transition. */
function CssTransitionTransform({ count, size }: ScenarioProps) {
  const tick = useTick(DURATION);
  const x = tick % 2 === 0 ? 0 : DISTANCE;
  return range(count).map((i) => (
    <Animated.View
      key={i}
      style={[
        boxStyle(size),
        {
          transform: [{ translateX: x }],
          transitionProperty: 'transform',
          transitionDuration: DURATION,
          transitionTimingFunction: 'linear',
        },
      ]}
    />
  ));
}

function CssTransitionLayout({ count, size }: ScenarioProps) {
  const tick = useTick(DURATION);
  const width = tick % 2 === 0 ? size : size * 1.4;
  return range(count).map((i) => (
    <Animated.View
      key={i}
      style={[
        boxStyle(size),
        {
          width,
          transitionProperty: 'width',
          transitionDuration: DURATION,
          transitionTimingFunction: 'linear',
        },
      ]}
    />
  ));
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** Same as uas-transform, but every box is far outside the viewport. */
function Offscreen({ count, size }: ScenarioProps) {
  return (
    <View style={styles.offscreen}>
      {range(count).map((i) => (
        <UasTransformItem key={i} size={size} />
      ))}
    </View>
  );
}

/** Same as uas-transform, but the whole subtree has opacity 0. */
function Invisible({ count, size }: ScenarioProps) {
  return (
    <View style={[styles.grid, styles.invisible]}>
      {range(count).map((i) => (
        <UasTransformItem key={i} size={size} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------

function perItem(Item: React.ComponentType<{ size: number }>) {
  return function PerItem({ count, size }: ScenarioProps) {
    return range(count).map((i) => <Item key={i} size={size} />);
  };
}

export interface Scenario {
  description: string;
  component: React.ComponentType<ScenarioProps>;
  /** Scenario lays out its own container instead of the default grid. */
  ownContainer?: boolean;
}

export const SCENARIOS: Record<string, Scenario> = {
  empty: { description: 'Nothing rendered', component: Empty },
  static: { description: 'Static plain Views', component: Static },
  'uas-idle': {
    description: 'useAnimatedStyle, shared value never changes',
    component: perItem(UasIdleItem),
  },
  'uas-finished': {
    description: 'withTiming once on mount, then idle',
    component: perItem(UasFinishedItem),
  },
  'rn-animated-native': {
    description: 'RN Animated loop, useNativeDriver',
    component: perItem(RNAnimatedNativeItem),
  },
  'js-raf': {
    description: 'requestAnimationFrame + setState (JS driven)',
    component: JsRaf,
  },
  'uas-transform': {
    description: 'per-box shared value, withRepeat(withTiming), translateX',
    component: perItem(UasTransformItem),
  },
  'uas-opacity': {
    description: 'per-box withRepeat(withTiming), opacity',
    component: perItem(UasOpacityItem),
  },
  'uas-color': {
    description: 'per-box interpolateColor backgroundColor',
    component: perItem(UasColorItem),
  },
  'uas-layout': {
    description: 'per-box withRepeat(withTiming), width (layout prop)',
    component: perItem(UasLayoutItem),
  },
  'uas-spring': {
    description: 'per-box withRepeat(withSpring), translateX',
    component: perItem(UasSpringItem),
  },
  'uas-shared-sv': {
    description: 'one shared value, one useAnimatedStyle per box',
    component: UasSharedSv,
  },
  'uas-parent': {
    description: 'one shared value, one useAnimatedStyle on the parent',
    component: UasParent,
    ownContainer: true,
  },
  'derived-chain': {
    description: 'per-box 3x useDerivedValue chain feeding a style',
    component: perItem(DerivedChainItem),
  },
  'frame-callback': {
    description: 'useFrameCallback writing an array shared value',
    component: FrameCallback,
  },
  'frame-callback-idle': {
    description: 'empty useFrameCallback, static views',
    component: FrameCallbackIdle,
  },
  sensor: {
    description: 'useAnimatedSensor(GYROSCOPE) read by every box',
    component: Sensor,
  },
  'sensor-idle': {
    description: 'useAnimatedSensor(GYROSCOPE) not read, static views',
    component: SensorIdle,
  },
  'props-svg': {
    description: 'useAnimatedProps on react-native-svg Circle r',
    component: perItem(AnimatedPropsSvgItem),
  },
  'props-text': {
    description: 'useAnimatedProps TextInput text counter',
    component: perItem(AnimatedPropsTextItem),
  },
  'layout-enter-exit': {
    description: 'FadeIn/FadeOut on half the boxes every second',
    component: LayoutEnteringExiting,
  },
  'layout-transition': {
    description: 'LinearTransition on reorder every second',
    component: LayoutTransition,
  },
  'css-anim-transform': {
    description: 'CSS animation translateX infinite',
    component: cssAnimation('transform'),
  },
  'css-anim-opacity': {
    description: 'CSS animation opacity infinite',
    component: cssAnimation('opacity'),
  },
  'css-anim-color': {
    description: 'CSS animation backgroundColor infinite',
    component: cssAnimation('color'),
  },
  'css-anim-layout': {
    description: 'CSS animation width infinite',
    component: CssAnimationLayout,
  },
  'css-transition-transform': {
    description: 'CSS transition translateX, state flip every second',
    component: CssTransitionTransform,
  },
  'css-transition-layout': {
    description: 'CSS transition width, state flip every second',
    component: CssTransitionLayout,
  },
  offscreen: {
    description: 'uas-transform outside the viewport',
    component: Offscreen,
    ownContainer: true,
  },
  invisible: {
    description: 'uas-transform under an opacity: 0 parent',
    component: Invisible,
    ownContainer: true,
  },
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  invisible: {
    opacity: 0,
  },
  offscreen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
    top: 10000,
    left: 0,
    right: 0,
  },
  text: {
    color: 'white',
    padding: 0,
    textAlign: 'center',
  },
});
