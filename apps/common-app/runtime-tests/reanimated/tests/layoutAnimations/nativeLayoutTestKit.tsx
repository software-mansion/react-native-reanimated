import type { ComponentRef, RefObject } from 'react';
import React, { useEffect, useState } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type {
  EasingFunction,
  EasingFunctionFactory,
  EntryExitAnimationFunction,
  LayoutAnimation,
  LayoutAnimationFunction,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  LinearTransition,
  makeMutable,
  ReduceMotion,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { runOnUISync, scheduleOnRN } from 'react-native-worklets';

import {
  getTestComponent,
  render,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

export type TraceEvent = {
  event: string;
  surfaceId: number;
  tag: number;
  owner: string;
  generation: number;
  monotonicTimeMs: number;
  target?: string;
  endpointPolicy?: string;
  finished?: boolean;
  outcome?: string;
  reason?: string;
  buildFailure?: string;
  transactionNumber?: number;
  leafValue?: number;
  layoutAnimationType?: string;
};

export type TargetSample = {
  model: number[];
  presentation: number[];
  /** The view is allowed to antialias its edges. */
  edgeAntialiasing: boolean;
  /**
   * The platform key of each physical playback on the view:
   * `reanimated.<owner>.<generation>.<target>`.
   */
  playbackKeys: string[];
  /**
   * The physical animations of the playback of the target, in the order in
   * which the platform applies them. Each has its value at the start and at the
   * end of each segment.
   */
  members: { property: string; values: number[][] }[];
  monotonicTimeMs: number;
};

export type NativeAnimationDevTools = {
  takeNativeAnimationTrace?: (callback: (events: TraceEvent[]) => void) => void;
  sampleNativeAnimationTarget?: (
    tag: number,
    target: string,
    callback: (sample: TargetSample | undefined) => void
  ) => void;
};

export const devTools = (
  globalThis as unknown as { __reanimatedModuleProxy: NativeAnimationDevTools }
).__reanimatedModuleProxy;

// The entries exist only in development builds of the native code, and the route only with the flag. The legacy
// proxy has no native route.
export const hasNativeLayoutStarts =
  Platform.OS === 'ios' &&
  getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION') &&
  !getStaticFeatureFlag('USE_LEGACY_LAYOUT_ANIMATIONS_PROXY') &&
  devTools.takeNativeAnimationTrace !== undefined;

// The samples need the native animation host, which each of the two flags creates.
export const hasTargetSamples =
  Platform.OS === 'ios' &&
  (getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION') ||
    getStaticFeatureFlag('IOS_CSS_CORE_ANIMATION')) &&
  devTools.sampleNativeAnimationTarget !== undefined;

export const BOX_REF = 'NativeLayoutStartBox';
export const BOX_SIZE = 50;
export const START_LEFT = 0;
export const END_LEFT = 100;
export const END_TOP = 40;
export const DURATION = 400;
export const POSITION_TOLERANCE = 0.5;
export const REPEATED_STARTS = 30;
export const FILTER_OPACITY = 0.5;
// The travel of two display frames at 60 fps.
export const FIRST_FRAME_TRAVEL = ((END_LEFT - START_LEFT) / DURATION) * 34;
export const FRAME_MS = 1000 / 60;
export const LAYOUT_DURATION = 4 * DURATION;
export const SAMPLED_OPACITY_TOLERANCE = 0.03;

export const centerOf = (origin: number) => origin + BOX_SIZE / 2;

export function takeTrace(): Promise<TraceEvent[]> {
  return new Promise((resolve) => {
    devTools.takeNativeAnimationTrace?.(resolve);
  });
}

export async function takeTraceOf(tag: number) {
  return (await takeTrace()).filter((event) => event.tag === tag);
}

// The events of the host and of the starts. The client reports and the captures of live tracks are not in it.
export const isHostEvent = ({ event }: TraceEvent) =>
  event !== 'ClientAdmitted' &&
  event !== 'ClientEnded' &&
  event !== 'LayoutLeafCaptured';

export const isClientReport = ({ event }: TraceEvent) =>
  event === 'ClientAdmitted' || event === 'ClientEnded';

export function sample(tag: number, target: string): Promise<TargetSample> {
  return new Promise((resolve, reject) => {
    devTools.sampleNativeAnimationTarget?.(tag, target, (targetSample) =>
      targetSample ? resolve(targetSample) : reject(new Error('no view'))
    );
  });
}

export async function sampleOpacity(tag: number) {
  const { model, presentation, playbackKeys, monotonicTimeMs } = await sample(
    tag,
    'Opacity'
  );
  return {
    model: model[0],
    presentation: presentation[0],
    keys: playbackKeys.length,
    time: monotonicTimeMs,
  };
}

export async function sampleOpacityPair(nativeTag: number, frameTag: number) {
  const [native, frame] = await Promise.all([
    sampleOpacity(nativeTag),
    sampleOpacity(frameTag),
  ]);
  return { native, frame };
}

export async function samplePosition(tag: number) {
  const { model, presentation, playbackKeys } = await sample(tag, 'Position');
  return {
    x: model[0],
    y: model[1],
    presentationX: presentation[0],
    keys: playbackKeys.length,
  };
}

/**
 * What one leaf of an entering or exiting animation shows in the first
 * component of a sample target.
 */
export type Track = {
  sampleTarget: 'Opacity' | 'Position' | 'Transform';
  traceTarget: string;
  from: number;
  to: number;
  /** Absent for a linear easing. */
  easing?: TrackEasing;
};

/** The curve of an easing, and the time at which the curve has a progress. */
export type TrackEasing = { curve: EasingFunction; timeOf: EasingFunction };

/** The default easing of `withTiming`. */
export const DEFAULT_EASING: TrackEasing = {
  curve: Easing.inOut(Easing.quad),
  timeOf: (progress) =>
    progress < 0.5
      ? Math.sqrt(Math.max(0, progress) / 2)
      : 1 - Math.sqrt(Math.max(0, 1 - progress) / 2),
};

export async function readTrack(tag: number, { sampleTarget }: Track) {
  const { model, presentation, playbackKeys, monotonicTimeMs } = await sample(
    tag,
    sampleTarget
  );
  return {
    shown: presentation[0],
    model: model[0],
    keys: playbackKeys.length,
    timeMs: monotonicTimeMs,
  };
}

export type TrackReading = Awaited<ReturnType<typeof readTrack>>;

export const isNear = (value: number, expected: number, tolerance = 0.01) =>
  Math.abs(value - expected) < tolerance;

export const linearAt =
  (from: number, to: number, startMs: number, durationMs: number) =>
  (timeMs: number) =>
    from +
    (to - from) * Math.min(1, Math.max(0, (timeMs - startMs) / durationMs));

/**
 * One part of a declared timeline: a move to `to` from the end value of the
 * part before it.
 */
export type TimedPart = {
  to: number;
  startMs: number;
  durationMs: number;
  curve: EasingFunction;
};

/**
 * The declared value at a time from the start of an animation. A part with no
 * start time did not start. A part with no duration shows its end value at its
 * start.
 */
export function declaredValueAt(
  start: number,
  parts: TimedPart[],
  timeMs: number
) {
  let value = start;
  for (const { to, startMs, durationMs, curve } of parts) {
    const elapsed = timeMs - startMs;
    if (!(elapsed >= 0)) {
      return value;
    }
    if (elapsed < durationMs) {
      return value + (to - value) * curve(elapsed / durationMs);
    }
    value = to;
  }
  return value;
}

/** The largest change of a declared value in one display frame around a time. */
export function declaredFrameChangeAt(
  valueAt: (timeMs: number) => number,
  timeMs: number
) {
  const value = valueAt(timeMs);
  let largest = 0;
  for (let step = -8; step <= 8; step++) {
    largest = Math.max(
      largest,
      Math.abs(valueAt(timeMs + (step * FRAME_MS) / 8) - value)
    );
  }
  return largest;
}

export async function sampleRows(
  tag: number,
  count: number,
  intervalMs: number
) {
  const rows = [];
  for (let index = 0; index < count; index++) {
    rows.push(await sampleOpacity(tag));
    await wait(intervalMs);
  }
  return rows;
}

export const twinStartTime = makeMutable(0);

/**
 * A linear easing that gives the start time of its animation on the animation
 * clock. Use it in a frame-driven animation: each call writes the time.
 */
export const recordedLinearOf = (durationMs: number) => (progress: number) => {
  'worklet';
  const now = global.__frameTimestamp ?? global._getAnimationTimestamp();
  twinStartTime.value = now - progress * durationMs;
  return progress;
};

/**
 * The curve of `easing` in a form that gives the start time of its animation on
 * the animation clock. Use it in a frame-driven animation.
 */
export const recordedCurveOf = (
  easing: EasingFunction | EasingFunctionFactory,
  durationMs: number
) => {
  const curve = curveOf(easing);
  return (progress: number) => {
    'worklet';
    const now = global.__frameTimestamp ?? global._getAnimationTimestamp();
    twinStartTime.value = now - progress * durationMs;
    return curve(progress);
  };
};

type AnimationFunction = (values: never) => LayoutAnimation;
type AnimationValues =
  | Parameters<EntryExitAnimationFunction>[0]
  | Parameters<LayoutAnimationFunction>[0];

type AnimationSource = { build: () => AnimationFunction } | AnimationFunction;
type BuiltLeaf = Partial<FrameAnimation> & { __nativeTiming?: unknown };

/**
 * The animation of a builder or of a function, with a call of `prepare` for
 * each leaf of each build.
 */
function withPreparedLeaves(
  animation: AnimationSource,
  prepare: (leaf: BuiltLeaf) => void
) {
  const build = (
    typeof animation === 'function' ? animation : animation.build()
  ) as (values: AnimationValues) => LayoutAnimation;
  return (values: AnimationValues) => {
    'worklet';
    const result = build(values);
    const leaves = Object.values(result.animations).flatMap((leaf) =>
      Array.isArray(leaf)
        ? leaf.flatMap((operation: Record<string, unknown>) =>
            Object.values(operation)
          )
        : [leaf]
    );
    for (const leaf of leaves) {
      if (typeof leaf === 'object' && leaf !== null) {
        prepare(leaf as BuiltLeaf);
      }
    }
    return result;
  };
}

/**
 * The animation of a builder or of a function with no native description on its
 * leaves. It is frame-driven, and its trace has the failure
 * `UnsupportedTiming`.
 */
export function frameDrivenOf(animation: AnimationSource) {
  return withPreparedLeaves(animation, (leaf) => {
    'worklet';
    delete leaf.__nativeTiming;
    recordFrameTimes(leaf);
  });
}

/**
 * The animation of a builder or of a function with its native description. Each
 * frame that the frame driver gives to it has a record of its time, as each
 * frame of an animation of `frameDrivenOf`.
 */
export function frameTimedOf(animation: AnimationSource) {
  return withPreparedLeaves(animation, recordFrameTimes);
}

export const namedBuilderCalls: string[] = [];
function recordNamedBuilderCall(name: string) {
  namedBuilderCalls.push(name);
}

/**
 * The animation of a builder or of a function, with a record of each call of
 * its function under `name`.
 */
export function countedOf(
  name: string,
  animation: { build: () => AnimationFunction } | AnimationFunction
) {
  const build = (
    typeof animation === 'function' ? animation : animation.build()
  ) as (values: AnimationValues) => LayoutAnimation;
  return (values: AnimationValues) => {
    'worklet';
    scheduleOnRN(recordNamedBuilderCall, name);
    return build(values);
  };
}

type FrameAnimation = {
  onFrame: (animation: FrameAnimation, now: number) => boolean;
};

/**
 * The time of the last frame of an animation of `frameDrivenOf` or of
 * `frameTimedOf`.
 */
export const frameDriverFrameTime = makeMutable(0);

// A leaf of EntryExitTransition can be an object that is not an animation.
function recordFrameTimes(animation: Partial<FrameAnimation>) {
  'worklet';
  const onFrame = animation.onFrame;
  if (!onFrame) {
    return;
  }
  animation.onFrame = (self, now) => {
    frameDriverFrameTime.value = now;
    return onFrame(self, now);
  };
}

const frameDriverClock = () => {
  'worklet';
  return {
    frameTime: frameDriverFrameTime.value,
    now: global._getAnimationTimestamp(),
  };
};

export type FrameDriverRow<TRow> = TRow & {
  /**
   * The time after the samples minus the time of the last frame of the frame
   * driver before them. More than one display frame: the frame driver has no
   * frame for the instant of the samples.
   */
  lateMs: number;
  /** `lateMs` of each row that was taken again. */
  lateFramesMs: number[];
};

const FRAME_DRIVER_TRIES = 5;
let frameDriverRetakes = 0;

/**
 * The samples of `take` at an instant for which an animation of `frameDrivenOf`
 * has its frame. The frame driver has no frame while the main thread is busy,
 * and a native animation plays on: samples of such an instant do not compare
 * the two at one time, so they are taken again after the next frames.
 */
export async function takeAtFrameDriverFrame<TRow extends object>(
  take: () => Promise<TRow>
): Promise<FrameDriverRow<TRow>> {
  const lateFramesMs: number[] = [];
  for (;;) {
    const { frameTime } = runOnUISync(frameDriverClock);
    const row = await take();
    const lateMs = runOnUISync(frameDriverClock).now - frameTime;
    if (lateMs <= FRAME_MS || lateFramesMs.length === FRAME_DRIVER_TRIES) {
      return { ...row, lateMs, lateFramesMs };
    }
    lateFramesMs.push(lateMs);
    frameDriverRetakes++;
    console.log(
      `FRAME-DRIVER-RETAKE | ${frameDriverRetakes} | try ${lateFramesMs.length} | frame of the twin late ${lateMs.toFixed(1)} ms`
    );
    await waitForFrames();
  }
}

/**
 * Easings with a native form that are not linear: two have control points, and
 * the native route fits the others.
 */
export const CURVED_EASINGS: Record<
  string,
  EasingFunction | EasingFunctionFactory
> = {
  'Easing.ease': Easing.ease,
  'a Bezier curve': Easing.bezier(0.3, 0, 0.7, 1),
  'Easing.inOut(Easing.quad)': Easing.inOut(Easing.quad),
  'Easing.sin': Easing.sin,
  'Easing.out(Easing.exp)': Easing.out(Easing.exp),
  'Easing.bounce': Easing.bounce,
};

const animationTime = () => {
  'worklet';
  return global._getAnimationTimestamp();
};

/** The time of the sample clock minus the time of the animation clock. */
export async function sampleClockOffset(tag: number) {
  let best = { width: Infinity, offset: 0 };
  for (let attempt = 0; attempt < 6; attempt++) {
    const before = runOnUISync(animationTime);
    const { monotonicTimeMs } = await sample(tag, 'Transform');
    const after = runOnUISync(animationTime);
    if (after - before < best.width) {
      best = {
        width: after - before,
        offset: monotonicTimeMs - (before + after) / 2,
      };
    }
  }
  return best;
}

export const playbackCountOf = (
  { playbackKeys }: TargetSample,
  generation: number
) => playbackKeys.filter((key) => key.split('.')[2] === `${generation}`).length;

export async function takeTraceUntilSurfaceClosed(surfaceId: number) {
  const events: TraceEvent[] = [];
  const isClosed = () =>
    events.some(
      (event) =>
        event.event === 'SurfaceClosed' && event.surfaceId === surfaceId
    );
  for (let attempt = 0; attempt < 40 && !isClosed(); attempt++) {
    await wait(25);
    events.push(...(await takeTrace()));
  }
  return events;
}

export function summarize(events: TraceEvent[]) {
  return events
    .map(({ event, target, finished, outcome, reason, buildFailure }) =>
      [event, target, finished, outcome, reason, buildFailure]
        .filter((part) => part !== undefined)
        .join(':')
    )
    .join(' > ');
}

export const callbacks: string[] = [];
export const callbackTimes: Record<string, number> = {};
export function recordCallback(name: string, finished: boolean) {
  callbacks.push(`${name}:${finished}`);
  callbackTimes[name] = performance.now();
}

/** A callback of a layout animation that records its result under `name`. */
export const callbackOf = (name: string) => (finished: boolean) => {
  'worklet';
  scheduleOnRN(recordCallback, name, finished);
};

export let builderCalls = 0;
export function recordBuilderCall() {
  builderCalls++;
}

export type Key =
  | 'originX'
  | 'originY'
  | 'opacity'
  | 'width'
  | 'height'
  | 'borderRadius';

export type Leaf = {
  duration?: number;
  /** Each entry is one `withDelay` wrapper, the outer one first. */
  delays?: number[];
  easing?: EasingFunction | EasingFunctionFactory | 'default';
  /**
   * The opacity before the commit, or an offset from the current value of a
   * layout key.
   */
  initial?: number | 'none';
  /**
   * The opacity after the commit, or an offset from the target value of a
   * layout key.
   */
  to?: number;
  isSpring?: boolean;
  hasCallback?: boolean;
  reduceMotion?: ReduceMotion;
  /** The leaf exists only when the layout value of its key changes. */
  onlyWhenChanged?: boolean;
  /** The builder sets reduced motion on the animation after its creation. */
  setsReduceMotion?: boolean;
};

export type Leaves = Partial<Record<Key, Leaf>>;

export type OperationLeaf = Leaf & {
  /** The array of animations holds the end value and no animation. */
  isPlain?: boolean;
};

export type Operation = [
  kind: string,
  from: number | string | number[],
  to: number | string | number[],
  leaf?: OperationLeaf,
];

/** The style transform that the mount of the end state of `operations` needs. */
export const endTransformOf = (operations: Operation[]) =>
  operations.map(([kind, , to]) => ({
    [kind]:
      kind.startsWith('rotate') && typeof to === 'number' ? `${to}rad` : to,
  })) as ViewStyle['transform'];

export type TransformLeaf = {
  operations: Operation[];
  /** For each operation that does not set the property. */
  shared?: Leaf;
  hasNoInitialValue?: boolean;
};

export type LayoutOptions = {
  name?: string;
  initialOnlyKey?: string;
  transform?: TransformLeaf;
  /**
   * The builder keeps the UI thread for this time, so the start is late on its
   * timeline.
   */
  blocksForMs?: number;
};

export function blockUIThread(durationMs: number) {
  'worklet';
  const end = global._getAnimationTimestamp() + durationMs;
  while (global._getAnimationTimestamp() < end) {
    continue;
  }
}

export function layoutOf(
  leaves: Leaves,
  { name, initialOnlyKey, transform, blocksForMs = 0 }: LayoutOptions = {}
): LayoutAnimationFunction {
  return (values) => {
    'worklet';
    scheduleOnRN(recordBuilderCall);
    blockUIThread(blocksForMs);
    const animationOf = (toValue: number | string | number[], leaf: Leaf) => {
      'worklet';
      const config: Record<string, unknown> = {
        duration: leaf.duration ?? DURATION,
        reduceMotion: leaf.reduceMotion,
      };
      if (leaf.easing !== 'default') {
        config.easing = leaf.easing ?? Easing.linear;
      }
      let animation = leaf.isSpring
        ? withSpring(toValue)
        : withTiming(
            toValue,
            config,
            leaf.hasCallback
              ? () => {
                  'worklet';
                }
              : undefined
          );
      for (const delay of [...(leaf.delays ?? [])].reverse()) {
        animation = withDelay(delay, animation);
      }
      if (leaf.setsReduceMotion) {
        (animation as { reduceMotion?: boolean }).reduceMotion = true;
      }
      return animation;
    };
    const current: Record<string, number> = {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
      width: values.currentWidth,
      height: values.currentHeight,
    };
    const target: Record<string, number> = {
      originX: values.targetOriginX,
      originY: values.targetOriginY,
      width: values.targetWidth,
      height: values.targetHeight,
    };
    const initialValues: Record<string, unknown> = {};
    const animations: Record<string, unknown> = {};
    for (const key of Object.keys(leaves)) {
      const leaf = leaves[key as Key]!;
      if (leaf.onlyWhenChanged && current[key] === target[key]) {
        continue;
      }
      const isLayoutKey = key in target;
      const toValue = isLayoutKey ? target[key] + (leaf.to ?? 0) : leaf.to!;
      if (leaf.initial !== 'none') {
        initialValues[key] = isLayoutKey
          ? current[key] + (leaf.initial ?? 0)
          : leaf.initial!;
      }
      animations[key] = animationOf(toValue, leaf);
    }
    if (transform) {
      if (!transform.hasNoInitialValue) {
        initialValues.transform = transform.operations.map(([kind, from]) => ({
          [kind]: from,
        }));
      }
      animations.transform = transform.operations.map(([kind, , to, leaf]) => ({
        [kind]: leaf?.isPlain
          ? to
          : animationOf(to, { ...transform.shared, ...leaf }),
      }));
    }
    if (initialOnlyKey) {
      initialValues[initialOnlyKey] = 1;
    }
    return {
      initialValues,
      animations,
      callback: name
        ? (finished: boolean) => {
            'worklet';
            scheduleOnRN(recordCallback, name, finished);
          }
        : undefined,
    };
  };
}

export const MALFORMED_BEZIER = {
  bezier: 'ease',
  factory: () => {
    'worklet';
    return (t: number) => {
      'worklet';
      return t;
    };
  },
} as unknown as EasingFunctionFactory;

export const MOVE = layoutOf({ originX: {}, originY: {} });

export type BoxProps = {
  left: number;
  top?: number;
  width?: number;
  opacity?: number;
  hasOpacityFilter?: boolean;
  transform?: ViewStyle['transform'];
  transformOrigin?: ViewStyle['transformOrigin'];
  layout?: Parameters<typeof Animated.View>[0]['layout'];
  exiting?: Parameters<typeof Animated.View>[0]['exiting'];
  refName?: string;
};

export function Box({
  left,
  top = 0,
  width = BOX_SIZE,
  opacity = 1,
  hasOpacityFilter = false,
  transform,
  transformOrigin,
  layout = MOVE,
  exiting,
  refName = BOX_REF,
}: BoxProps) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      layout={layout}
      exiting={exiting}
      style={[
        styles.box,
        { marginLeft: left, marginTop: top, width, opacity },
        transform !== undefined && { transform },
        transformOrigin !== undefined && { transformOrigin },
        hasOpacityFilter && { filter: [{ opacity: FILTER_OPACITY }] },
      ]}
    />
  );
}

export function Scene({
  isMounted = true,
  ...box
}: BoxProps & { isMounted?: boolean }) {
  return <View style={styles.container}>{isMounted && <Box {...box} />}</View>;
}

export const ROW_REFS = Array.from(
  { length: 150 },
  (_, index) => `NativeLayoutStartRowBox${index}`
);
export const LONG_MOVE = layoutOf({ originX: { duration: LAYOUT_DURATION } });

export function Row({ left, count }: { left: number; count: number }) {
  return (
    <View style={styles.container}>
      {ROW_REFS.slice(0, count).map((refName) => (
        <View key={refName} style={styles.rowItem}>
          <Box left={left} refName={refName} layout={LONG_MOVE} />
        </View>
      ))}
    </View>
  );
}

export type ScrollViewRef = RefObject<ComponentRef<typeof ScrollView> | null>;

/**
 * A scroll view that takes its children out of the window when they are out of
 * its clip rectangle. React Native recycles a view with its old props and with
 * no clipping, so the clipping starts only when the prop changes.
 */
export function ClippingScrollView({
  scrollRef,
  style,
  children,
}: React.PropsWithChildren<{
  scrollRef?: ScrollViewRef;
  style?: StyleProp<ViewStyle>;
}>) {
  const [clips, setClips] = useState(false);
  useEffect(() => setClips(true), []);
  return (
    <ScrollView ref={scrollRef} removeClippedSubviews={clips} style={style}>
      {children}
    </ScrollView>
  );
}

export function ModalScene({ left }: { left: number }) {
  return (
    <Modal visible transparent animationType="none">
      <View style={styles.container}>
        <Box left={left} />
      </View>
    </Modal>
  );
}

type PairBoxProps = { layout: LayoutAnimationFunction; refName?: string };

type SurfaceBox = { left: number; top?: number };

export const SECOND_BOX_REF = 'NativeLayoutStartSecondSurfaceBox';
export const SECOND_CSS_BOX_REF = 'NativeLayoutStartSecondSurfaceCSSBox';
export let setSecondSurfaceBox: (box: SurfaceBox) => void = () => {};
export let setSecondSurfaceOpacity: (opacity: number) => void = () => {};

function SecondSurfaceCSSBox() {
  const [opacity, setOpacity] = useState(1);
  const ref = useTestRef(SECOND_CSS_BOX_REF);
  setSecondSurfaceOpacity = setOpacity;
  return (
    <Animated.View
      ref={ref}
      style={[
        styles.box,
        {
          opacity,
          transitionProperty: 'opacity',
          transitionDuration: LAYOUT_DURATION,
          transitionTimingFunction: 'linear',
        },
      ]}
    />
  );
}

export function secondSurfaceSceneOf({
  layout = LONG_MOVE,
  BoxComponent = Box,
  hasCSSBox = false,
}: {
  layout?: LayoutAnimationFunction;
  BoxComponent?: React.ComponentType<SurfaceBox & PairBoxProps>;
  hasCSSBox?: boolean;
} = {}) {
  return function SecondSurfaceScene() {
    const [box, setBox] = useState<SurfaceBox>({ left: START_LEFT });
    setSecondSurfaceBox = setBox;
    return (
      <View style={styles.container}>
        <BoxComponent {...box} refName={SECOND_BOX_REF} layout={layout} />
        {hasCSSBox && <SecondSurfaceCSSBox />}
      </View>
    );
  };
}

export const SecondSurfaceScene = secondSurfaceSceneOf({ hasCSSBox: true });

export async function mountScene(
  scene: Parameters<typeof render>[0],
  refName = BOX_REF
) {
  await render(scene);
  await wait(50);
  await takeTrace();
  callbacks.length = 0;
  return getTestComponent(refName).getTag();
}

export async function renderBox(box: Partial<BoxProps> = {}) {
  const tag = await mountScene(<Scene left={START_LEFT} {...box} />);
  builderCalls = 0;
  return tag;
}

export const NATIVE_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:PositionY > Admitted';
export const NATIVE_END =
  'TrackEnded:PositionX:true > TrackEnded:PositionY:true > Ended:Finished:None';

// `summarizeEnd` of a command that started and ended.
export const SORTED_START_AND_END = `TrackEnded:PositionX:true > TrackEnded:PositionY:true > ${NATIVE_START} > Ended:Finished:None`;

// Tracks that end in one display frame report in no fixed order.
export function summarizeEnd(events: TraceEvent[]) {
  const hostEvents = events.filter(isHostEvent);
  const isTrackEnd = ({ event }: TraceEvent) => event === 'TrackEnded';
  return summarize([
    ...hostEvents
      .filter(isTrackEnd)
      .sort((a, b) => a.target!.localeCompare(b.target!)),
    ...hostEvents.filter((event) => !isTrackEnd(event)),
  ]);
}

export const FRAME_BOX_REF = 'NativeLayoutStartFrameDrivenBox';
export const PAIR_DURATION = 3000;
export const PAIR_LEFT = 200;
export const PAIR_TOP = 60;
export const PAIR_CELL_HEIGHT = BOX_SIZE + PAIR_TOP;
export const START_OPACITY = 1;
export const END_OPACITY = 0.2;
export const OPACITY_TOLERANCE = 0.01;

export const pairLayoutsOf = (leaves: (hasCallback: boolean) => Leaves) => ({
  nativeLayout: layoutOf(leaves(false), { name: 'native' }),
  frameLayout: layoutOf(leaves(true), { name: 'frame' }),
});

type PairLayoutFunctions = ReturnType<typeof pairLayoutsOf>;

type PairOfProps<TBox extends object> = PairLayoutFunctions & {
  box: TBox;
  BoxComponent: React.ComponentType<TBox & PairBoxProps>;
  isMounted?: boolean;
  padding?: number;
};

export function PairOf<TBox extends object>({
  box,
  BoxComponent,
  nativeLayout,
  frameLayout,
  isMounted = true,
  padding = 0,
}: PairOfProps<TBox>) {
  const cellStyle = [styles.pairCell, { paddingLeft: padding }];
  return (
    <View>
      <View style={cellStyle}>
        {isMounted && <BoxComponent {...box} layout={nativeLayout} />}
      </View>
      <View style={cellStyle}>
        {isMounted && (
          <BoxComponent {...box} layout={frameLayout} refName={FRAME_BOX_REF} />
        )}
      </View>
    </View>
  );
}

export type PairProps = Pick<BoxProps, 'left' | 'top' | 'opacity' | 'exiting'> &
  PairLayoutFunctions & { isMounted?: boolean };

export function Pair({
  nativeLayout,
  frameLayout,
  isMounted,
  ...box
}: PairProps) {
  return (
    <PairOf
      BoxComponent={Box}
      box={box}
      nativeLayout={nativeLayout}
      frameLayout={frameLayout}
      isMounted={isMounted}
    />
  );
}

export function curveOf(easing: EasingFunction | EasingFunctionFactory) {
  return typeof easing === 'function' ? easing : easing.factory();
}

const SIZE_BOX_IMAGE =
  require('../../../../src/apps/reanimated/examples/assets/doge.png') as ImageSourcePropType;

export type Frame = { x: number; y: number; width: number; height: number };

const frameOf = (
  [centerX, centerY]: number[],
  [width, height]: number[]
): Frame => ({
  x: centerX - width / 2,
  y: centerY - height / 2,
  width,
  height,
});

export async function sampleFrame(tag: number) {
  const [position, size] = await Promise.all([
    sample(tag, 'Position'),
    sample(tag, 'Size'),
  ]);
  return {
    model: frameOf(position.model, size.model),
    presentation: frameOf(position.presentation, size.presentation),
    playbackKeys: size.playbackKeys,
    monotonicTimeMs: size.monotonicTimeMs,
  };
}

export const frameDistance = (first: Frame, second: Frame) =>
  Math.max(
    Math.abs(first.x - second.x),
    Math.abs(first.y - second.y),
    Math.abs(first.width - second.width),
    Math.abs(first.height - second.height)
  );

type SizeBoxHost = 'View' | 'Text' | 'Image' | 'ScrollView';

type SizeBoxHostProps = React.PropsWithChildren<{
  ref: ReturnType<typeof useTestRef>;
  layout: BoxProps['layout'];
  collapsable: boolean;
  source?: ImageSourcePropType;
  style: StyleProp<ViewStyle>;
}>;

const SIZE_BOX_HOSTS: Record<
  SizeBoxHost,
  React.ComponentType<SizeBoxHostProps>
> = {
  View: Animated.View,
  Text: Animated.Text,
  // The props of an Image have no children and no `overflow: 'scroll'`.
  Image: Animated.Image as React.ComponentType<SizeBoxHostProps>,
  ScrollView: Animated.ScrollView,
};

export type SizeBoxProps = React.PropsWithChildren<{
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  host?: SizeBoxHost;
  style?: StyleProp<ViewStyle>;
  layout?: BoxProps['layout'];
  refName?: string;
}>;

export function SizeBox({
  left = 0,
  top = 0,
  width = BOX_SIZE,
  height = BOX_SIZE,
  host = 'View',
  style,
  layout,
  refName = BOX_REF,
  children,
}: SizeBoxProps) {
  const ref = useTestRef(refName);
  const Host = SIZE_BOX_HOSTS[host];
  return (
    <Host
      ref={ref}
      layout={layout}
      collapsable={false}
      source={host === 'Image' ? SIZE_BOX_IMAGE : undefined}
      style={[
        styles.sizeBox,
        { marginLeft: left, marginTop: top, width, height },
        style,
      ]}>
      {host === 'Text' ? 'Text' : children}
    </Host>
  );
}

export function SizeScene(box: SizeBoxProps) {
  return (
    <View style={styles.container}>
      <SizeBox {...box} />
    </View>
  );
}

export const SIZE_CELL_HEIGHT = 220;
export const SIZE_CELL_WIDTH = 200;

/** Where the cell of the frame-driven box is from the cell of the native box. */
export type PairOffset = { x: number; y: number };
export const PAIR_IN_COLUMN: PairOffset = { x: 0, y: SIZE_CELL_HEIGHT };
// The layout gives the two boxes of a row the same vertical values.
export const PAIR_IN_ROW: PairOffset = { x: SIZE_CELL_WIDTH, y: 0 };

export type SizePairProps = Omit<SizeBoxProps, 'layout' | 'refName'> & {
  nativeLayout: BoxProps['layout'];
  frameLayout: BoxProps['layout'];
  inRow?: boolean;
};

export type PairLayouts = Pick<SizePairProps, 'nativeLayout' | 'frameLayout'>;

/**
 * The frame-driven box has the leaves of LinearTransition and a callback on one
 * leaf.
 */
export const linearPairOf = (durationMs: number): PairLayouts => ({
  nativeLayout: LinearTransition.duration(durationMs).easing(Easing.linear),
  frameLayout: layoutOf({
    originX: { duration: durationMs, hasCallback: true },
    originY: { duration: durationMs },
    width: { duration: durationMs },
    height: { duration: durationMs },
  }),
});

export function SizePair({
  nativeLayout,
  frameLayout,
  inRow = false,
  ...box
}: SizePairProps) {
  const cellStyle = [styles.sizeCell, inRow && styles.sizeRowCell];
  return (
    <View style={inRow && styles.sizeRow}>
      <View style={cellStyle}>
        <SizeBox {...box} layout={nativeLayout} />
      </View>
      <View style={cellStyle}>
        <SizeBox {...box} layout={frameLayout} refName={FRAME_BOX_REF} />
      </View>
    </View>
  );
}

export async function sampleFramePair(offset = PAIR_IN_COLUMN) {
  const [native, frame] = await Promise.all([
    sampleFrame(getTestComponent(BOX_REF).getTag()),
    sampleFrame(getTestComponent(FRAME_BOX_REF).getTag()),
  ]);
  return {
    native: native.presentation,
    end: native.model,
    frame: {
      ...frame.model,
      x: frame.model.x - offset.x,
      y: frame.model.y - offset.y,
    },
    playbackKeys: native.playbackKeys,
    monotonicTimeMs: native.monotonicTimeMs,
  };
}

export type FramePairRow = Awaited<ReturnType<typeof sampleFramePair>>;

/**
 * One row at each fraction of `durationMs` after the call, then one row after
 * the end.
 */
export async function sampleFramePairAt(
  durationMs: number,
  fractions = [0.25, 0.5, 0.75],
  offset = PAIR_IN_COLUMN
) {
  const start = performance.now();
  const waitUntil = (elapsedMs: number) =>
    wait(Math.max(0, start + elapsedMs - performance.now()));
  const rows: FramePairRow[] = [];
  for (const fraction of fractions) {
    await waitUntil(fraction * durationMs);
    rows.push(await sampleFramePair(offset));
  }
  await waitUntil(durationMs + 300);
  rows.push(await sampleFramePair(offset));
  return rows;
}

const frameText = ({ x, y, width, height }: Frame) =>
  [x, y, width, height].map((value) => value.toFixed(2)).join(' ');

/** The two frames of each row, with the time of the row from the first row. */
export const describeFramePairRows = (rows: FramePairRow[]) =>
  rows
    .map(
      ({ native, frame, monotonicTimeMs }) =>
        `${(monotonicTimeMs - rows[0].monotonicTimeMs).toFixed(1)} ms native ${frameText(native)} frame driver ${frameText(frame)}`
    )
    .join(' | ');

/**
 * The largest distance of the native box from the frame-driven box before the
 * end, and at the end.
 */
export function framePairDistances(rows: FramePairRow[]) {
  const end = rows[rows.length - 1];
  return {
    during: Math.max(
      ...rows.slice(0, -1).map((row) => frameDistance(row.native, row.frame))
    ),
    atEnd: Math.max(
      frameDistance(end.native, end.frame),
      frameDistance(end.native, end.end)
    ),
    keysAtEnd: end.playbackKeys.length,
  };
}

export const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 120,
  },
  rowItem: {
    height: 2,
  },
  pairCell: {
    height: PAIR_CELL_HEIGHT,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
  sizeBox: {
    backgroundColor: 'teal',
  },
  sizeCell: {
    height: SIZE_CELL_HEIGHT,
  },
  sizeRow: {
    flexDirection: 'row',
  },
  sizeRowCell: {
    width: SIZE_CELL_WIDTH,
  },
});
