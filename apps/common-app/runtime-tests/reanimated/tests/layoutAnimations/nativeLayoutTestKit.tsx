import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import type {
  EasingFunction,
  EasingFunctionFactory,
  LayoutAnimationFunction,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  ReduceMotion,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  getTestComponent,
  render,
  useTestRef,
  wait,
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
};

export type TargetSample = {
  model: number[];
  presentation: number[];
  /**
   * The platform key of each physical playback on the view:
   * `reanimated.<owner>.<generation>.<target>`.
   */
  playbackKeys: string[];
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

// The entries exist only in development builds of the native code, and the route only with the flag.
export const hasNativeLayoutStarts =
  Platform.OS === 'ios' &&
  getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION') &&
  devTools.takeNativeAnimationTrace !== undefined;

export const BOX_REF = 'NativeLayoutStartBox';
export const BOX_SIZE = 50;
export const START_LEFT = 0;
export const END_LEFT = 100;
export const END_TOP = 40;
export const DURATION = 400;
export const POSITION_TOLERANCE = 0.5;
export const REPEATED_STARTS = 30;
export const PRESET_WAIT = 1500;
export const FILTER_OPACITY = 0.5;
// The travel of two display frames at 60 fps.
export const FIRST_FRAME_TRAVEL = ((END_LEFT - START_LEFT) / DURATION) * 34;
export const FRAME_MS = 1000 / 60;

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

export let builderCalls = 0;
export function recordBuilderCall() {
  builderCalls++;
}

export type Key = 'originX' | 'originY' | 'opacity' | 'width' | 'height';

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

export type LayoutOptions = {
  name?: string;
  initialOnlyKey?: string;
  /**
   * The builder keeps the UI thread for this time, so the start is late on its
   * timeline.
   */
  blocksForMs?: number;
};

export function layoutOf(
  leaves: Partial<Record<Key, Leaf>>,
  { name, initialOnlyKey, blocksForMs = 0 }: LayoutOptions = {}
): LayoutAnimationFunction {
  return (values) => {
    'worklet';
    scheduleOnRN(recordBuilderCall);
    const blockEnd = global._getAnimationTimestamp() + blocksForMs;
    while (global._getAnimationTimestamp() < blockEnd) {
      // The builder runs between the time origin and the admission.
    }
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
    const initialValues: Record<string, number> = {};
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
      animations[key] = animation;
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
export const LONG_MOVE = layoutOf({ originX: { duration: 4 * DURATION } });

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

export function ModalScene({ left }: { left: number }) {
  return (
    <Modal visible transparent animationType="none">
      <View style={styles.container}>
        <Box left={left} />
      </View>
    </Modal>
  );
}

export const SECOND_BOX_REF = 'NativeLayoutStartSecondSurfaceBox';
export const SECOND_CSS_BOX_REF = 'NativeLayoutStartSecondSurfaceCSSBox';
export let setSecondSurfaceLeft: (left: number) => void = () => {};
export let setSecondSurfaceOpacity: (opacity: number) => void = () => {};

export function SecondSurfaceScene() {
  const [left, setLeft] = useState(START_LEFT);
  const [opacity, setOpacity] = useState(1);
  const cssBoxRef = useTestRef(SECOND_CSS_BOX_REF);
  setSecondSurfaceLeft = setLeft;
  setSecondSurfaceOpacity = setOpacity;
  return (
    <View style={styles.container}>
      <Box left={left} refName={SECOND_BOX_REF} layout={LONG_MOVE} />
      <Animated.View
        ref={cssBoxRef}
        style={[
          styles.box,
          {
            opacity,
            transitionProperty: 'opacity',
            transitionDuration: 4 * DURATION,
            transitionTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

export async function renderBox(box: Partial<BoxProps> = {}) {
  await render(<Scene left={START_LEFT} {...box} />);
  await wait(50);
  await takeTrace();
  callbacks.length = 0;
  builderCalls = 0;
  return getTestComponent(BOX_REF).getTag();
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

export type PairProps = {
  left: number;
  top: number;
  opacity: number;
  nativeLayout: LayoutAnimationFunction;
  frameLayout: LayoutAnimationFunction;
  exiting?: BoxProps['exiting'];
  isMounted?: boolean;
};

export function Pair({
  nativeLayout,
  frameLayout,
  isMounted = true,
  ...box
}: PairProps) {
  return (
    <View>
      <View style={styles.pairCell}>
        {isMounted && <Box {...box} layout={nativeLayout} />}
      </View>
      <View style={styles.pairCell}>
        {isMounted && (
          <Box {...box} layout={frameLayout} refName={FRAME_BOX_REF} />
        )}
      </View>
    </View>
  );
}

export const curveOf = (easing: EasingFunction | EasingFunctionFactory) =>
  typeof easing === 'function' ? easing : easing.factory();

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
});
