import type { ComponentRef, RefObject } from 'react';
import React, { useEffect, useState } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import {
  Modal,
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type {
  EasingFunction,
  EasingFunctionFactory,
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
  LayoutAnimation,
  LayoutAnimationFunction,
  SharedValue,
  WithSpringConfig,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  ReduceMotion,
  setDynamicFeatureFlag,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { runOnUISync, scheduleOnRN } from 'react-native-worklets';

import {
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  AppleTargetSample,
  CommandHandle,
  PlatformTargetSample as TargetSample,
  TraceEvent,
} from '../nativeAnimationObservation';
import {
  hasNativeAnimationHost,
  hasNativeLayoutRoute,
  isNativeLayoutRouteConfigured,
  isNoView,
  NATIVE_ANIMATION_ROUTES,
  isOfCommand,
  NATIVE_ANIMATION_TEST_HOOKS,
  playbackIdOf,
  playbackIdsOf,
  routeOf,
  sample as sampleOf,
  takeTrace,
  testHookOf,
} from '../nativeAnimationObservation';
import { DRAW_TIME_STEP_MS } from '../viewSampler';
import { blockUIThread } from './nativeLayoutLoad';

export type {
  AndroidTargetSample,
  AppleTargetSample,
  CommandHandle,
  Playback,
  PlaybackMember,
  Route,
  PlatformTargetSample as TargetSample,
  TraceEvent,
} from '../nativeAnimationObservation';
export {
  hasNativeAnimationHost,
  hasNativeLayoutRoute,
  isNativeLayoutRouteConfigured,
  isNoView,
  NATIVE_ANIMATION_ROUTES,
  isOfCommand,
  NATIVE_ANIMATION_TEST_HOOKS,
  playbackIdOf,
  playbackIdsOf,
  routeOf,
  takeTrace,
  testHookOf,
};

/** The sample of the platform: the reads that each platform has. */
export const sample = (tag: number, target: string) =>
  sampleOf<TargetSample>(tag, target);

/** The reads of edge antialiasing and of the Core Animation member structure. */
export const appleSample = (tag: number, target: string) =>
  sampleOf<AppleTargetSample>(tag, target);

const IS_APPLE = Platform.OS === 'ios';

/**
 * Android refuses a Width or Height change of more than one pixel
 * (`AndroidNativeAnimationPlatform::canRealize`).
 */
export const PLAYS_SIZE_CHANGE = IS_APPLE;
export const ONE_PIXEL = 1 / PixelRatio.get();
/**
 * Android plays a Width or Height change of at most one pixel and a tolerance
 * of 0.01 (`ENDPOINT_TOLERANCE`) as a hold: the view shows the end size from
 * the mount.
 */
export const playsSizeChangeOf = (change: number) =>
  PLAYS_SIZE_CHANGE || Math.abs(change) <= ONE_PIXEL + 0.01;
/**
 * Android refuses RotateX, RotateY, and Perspective in a moving transform
 * (`isPlanar`).
 */
export const PLAYS_3D_OPERATIONS = IS_APPLE;
/** Android moves the geometry with `View.setAnimationMatrix`, from API 29. */
export const PLAYS_MOVING_GEOMETRY =
  IS_APPLE || (NATIVE_ANIMATION_ROUTES.apiLevel ?? 0) >= 29;
/**
 * A test that needs a moving native position or transform track: skipped
 * without `PLAYS_MOVING_GEOMETRY`. The suites `native layout reference` and
 * `native layout starts` have the fallback forms below API 29.
 */
export const movingGeometryTest = PLAYS_MOVING_GEOMETRY ? test : test.skip;

/** The target of a track, and whether the track changes its value. */
export type GeometryTrack = { target: string; moves: boolean };

/**
 * The targets that Android plays on `View.setAnimationMatrix`
 * (`isGeometryTarget` of `AndroidNativeAnimationPlatform.cpp`).
 */
const GEOMETRY_TARGETS: readonly string[] = [
  'PositionX',
  'PositionY',
  'Transform',
];

/**
 * A track of `tracks` moves a position or a transform: Android plays it
 * natively from API 29 (`playsTarget` of
 * `AndroidNativeAnimationPlatform.cpp`).
 */
export const movesGeometryOf = (tracks: readonly GeometryTrack[]) =>
  tracks.some(
    ({ target, moves }) => moves && GEOMETRY_TARGETS.includes(target)
  );

/** A key that is not plain, with two different ends or a part in `via`. */
export const declaresMotion = ({
  isPlain,
  from,
  to,
  leaf,
}: {
  isPlain?: boolean;
  from: LeafValue;
  to: LeafValue;
  leaf: Leaf;
}) => !isPlain && (from !== to || (leaf.via?.length ?? 0) > 0);

/** `movingGeometryTest` for tracks that move geometry, else `test`. */
export const testOfTracks = (tracks: readonly GeometryTrack[]) =>
  movesGeometryOf(tracks) ? movingGeometryTest : test;
/**
 * Core Animation removes the animations of a layer that leaves the window; an
 * Android animator plays to its end.
 */
export const REMOVES_TRACKS_OUT_OF_WINDOW = IS_APPLE;
/**
 * An identity base member and the additive reverse order
 * (`makeTransformMembers` of `REANativeAnimationPlatform.mm`).
 */
export const PLAYS_CORE_ANIMATION_MEMBERS = IS_APPLE;
export const HAS_EDGE_ANTIALIASING = IS_APPLE;
/**
 * Android plays the geometry on `View.setAnimationMatrix`: a 2D map that needs
 * the inverse of the model matrix, in the matrix where React Native writes a
 * skew (`admitsMovingGeometry` of `AndroidNativeAnimationPlatform.cpp`).
 */
export const WRITES_ANIMATION_MATRIX = !IS_APPLE;
/**
 * The executor record of a native opacity track keeps the committed opacity of
 * the mount, and the sample `model` reads it (`OpacityBinding` of
 * `TrackBinding.kt`, `modelOf` of `NativeAnimationExecutor.kt`).
 */
export const KEEPS_OPACITY_MODEL_IN_RECORD = !IS_APPLE;
/**
 * The end of a native group at a surface stop after a synchronous opacity
 * write, as measured: `SurfaceDestroyed` on Android, `Cancelled` on Apple. The
 * cause of the Apple result is not tested.
 */
export const SURFACE_STOP_END_AFTER_SYNCHRONOUS_WRITE = IS_APPLE
  ? 'Cancelled'
  : 'SurfaceDestroyed';
/**
 * Apple plays a transform only on a View, a Paragraph, or an Image
 * (`playsTransform` of `REANativeAnimationPlatform.mm`); the Android
 * `canRealize` has no rule of the component.
 */
export const PLAYS_TRANSFORM_ON_EACH_COMPONENT = !IS_APPLE;
/**
 * Core Animation refuses an opacity track on a view with an opacity filter
 * (`canRealize` of `REANativeAnimationPlatform.mm`); the Android `playsTarget`
 * has no filter rule.
 */
export const REFUSES_OPACITY_UNDER_FILTER = IS_APPLE;
/**
 * The pull of a React commit runs in a dispatch of mount items, and its
 * `didMountItems` reports it.
 */
export const MOUNTS_IN_DISPATCHES = !IS_APPLE;
/**
 * An Android matrix has no Z row or column: a sample has the six cells of a 2D
 * affine map.
 */
export const TRANSFORM_SAMPLE_CELLS: readonly number[] = IS_APPLE
  ? Array.from({ length: 16 }, (_, cell) => cell)
  : [0, 1, 4, 5, 12, 13];
/**
 * React Native on Android decomposes a `matrix` operation and sets only the
 * translation, the rotation, and the scale of the view: the shear of the matrix
 * does not show (`BaseViewManager.setTransformProperty`).
 */
export const SHOWS_MATRIX_SHEAR = IS_APPLE;
/**
 * Core Animation holds a held spring at its curve value, not at its end value,
 * so Apple refuses a spring segment on a held track (`playsTimings` of
 * `REANativeAnimationPlatform.mm`): the build of a springified exit fails with
 * `UnsupportedTarget`.
 */
export const PLAYS_HELD_SPRING = !IS_APPLE;
/**
 * Apple plays a spring only as the one segment of its timeline (`playsTimings`
 * of `REANativeAnimationPlatform.mm`): a spring operation with a hold beside it
 * makes the build fail with `UnsupportedTarget`.
 */
export const PLAYS_SPRING_WITH_HOLD = !IS_APPLE;

export type Band = { from: number; to: number };

export const BOX_REF = 'NativeLayoutStartBox';
export const BOX_SIZE = 50;
export const START_LEFT = 0;
export const END_LEFT = 100;
export const END_TOP = 40;
export const DURATION = 400;
export const POSITION_TOLERANCE = 0.5;
/**
 * How far a laid-out position or size can be from its declared number: Android
 * rounds each edge to the pixel grid, and at a density of 2.625 a whole number
 * of points is off it (measured: a centre of 125.142857 for 125).
 */
export const LAID_OUT_TOLERANCE = IS_APPLE ? 0.01 : 1 / PixelRatio.get();
export const REPEATED_STARTS = 30;
export const FILTER_OPACITY = 0.5;
// The travel of two display frames at 60 fps.
export const FIRST_FRAME_TRAVEL = ((END_LEFT - START_LEFT) / DURATION) * 34;
export const FRAME_MS = 1000 / 60;
// The presentation layer has a new animation only after the first display frame of its commit.
export const FIRST_FRAMES_MS = 3 * FRAME_MS;
/**
 * How late a frame callback runs after its frame time. Apple: no term. Android:
 * 21.7 ms, from the presentation reads of the phone (the off reads of the 18 ms
 * band are 19.4 to 34.1 ms old, 99 % to 32.4 ms). A direct measurement of the
 * emulator gives callback runs up to 25.7 ms after their frame time.
 */
export const FRAME_CALLBACK_LAG_MS = IS_APPLE ? 0 : 21.7;
/**
 * How long a presentation value stays. Apple: 15.7 to 17.7 ms in 76 intervals,
 * plus 0.3 ms. Android: a sample shows the animator value of the last frame
 * time, so one display frame plus the frame callback lag.
 */
export const PRESENTATION_STAY_MS = IS_APPLE
  ? 18
  : FRAME_MS + FRAME_CALLBACK_LAG_MS;
/**
 * How long a frame value can stay in the model in a late frame callback state.
 * Apple: no term. Android: one display frame, plus the largest run of a frame
 * callback after its frame time in the emulator runs of record REFMODEL-DIAG
 * step 3 (25.7 ms), plus the largest time from that run to the model value of
 * the native box in the run with that lag (2.8 ms). Single values of 11.9 to
 * 47.9 ms in the other runs of that table are not studied.
 */
export const LATE_CALLBACK_STAY_MS = IS_APPLE ? 0 : FRAME_MS + 25.7 + 2.8;
/**
 * A Fabric write in a frame callback draws from the next frame: its commit
 * mounts after the draw of its own frame (measured on Android, also with no
 * track on the view).
 */
export const ORDER_B_WRITE_DRAW_DELAY_MS =
  NATIVE_ANIMATION_ROUTES.synchronousProps ? 0 : FRAME_MS;
// Measured gaps of the reads of a key: 47.05 ms at most, 150.15 ms at least after a block.
export const READ_GAP_MS = 100;
// 2.146 - 0.460 + 0.091 ms, the measured edges of the removing tick.
export const REMOVAL_LEAD_MS = 1.78;
// Paused layer: a keyframe segment shows its start value while its eased progress is under 0.001 and its end value while it is over 0.999.
export const KEYFRAME_EDGE_HOLD = 0.001;
export const LAYOUT_DURATION = 4 * DURATION;
export const SAMPLED_OPACITY_TOLERANCE = 0.03;

export const centerOf = (origin: number) => origin + BOX_SIZE / 2;

/** The value of `promise`, or `null` when it has none after `timeoutMs`. */
export async function withTimeout<TValue>(
  promise: Promise<TValue>,
  timeoutMs: number
) {
  return Promise.race([promise, wait(timeoutMs).then(() => null)]);
}

export async function takeTraceOf(tag: number) {
  return (await takeTrace()).filter((event) => event.tag === tag);
}

export function requireEvent(
  events: TraceEvent[],
  command: CommandHandle,
  type: string
) {
  const found = events.find(
    (event) => event.event === type && isOfCommand(event, command)
  );
  if (!found) {
    throw new Error(
      `The trace has no ${type} event of the command ${describeCommand(command)}.`
    );
  }
  return found;
}

const describeCommand = ({
  surfaceId,
  tag,
  owner,
  generation,
}: CommandHandle) => `${owner} ${surfaceId}.${tag}.${generation}`;

// The events of the host and of the starts. The client reports and the captures of live tracks are not in it.
export const isHostEvent = ({ event }: TraceEvent) =>
  event !== 'ClientAdmitted' &&
  event !== 'ClientEnded' &&
  event !== 'LayoutLeafCaptured';

export const isClientReport = ({ event }: TraceEvent) =>
  event === 'ClientAdmitted' || event === 'ClientEnded';

/** The reads of one wait for a written model, in their order. */
export type ModelWait = {
  tag: number;
  target: string;
  /** The last read is the first with the written model. */
  reads: TargetSample[];
};

/** Each wait of `waitForModel` from the last reset, in its order. */
export const modelWaits: ModelWait[] = [];

/**
 * Reads the target of a view until `isWritten` is true for its model. A write
 * of the test that a later step must follow in the model returns this wait.
 */
export async function waitForModel(
  tag: number,
  target: string,
  isWritten: (model: number[]) => boolean,
  timeoutMs = 3000
): Promise<ModelWait> {
  const reads: TargetSample[] = [];
  const untilMs = performance.now() + timeoutMs;
  do {
    reads.push(await sample(tag, target));
    if (isWritten(reads[reads.length - 1].model)) {
      const modelWait = { tag, target, reads };
      modelWaits.push(modelWait);
      return modelWait;
    }
  } while (performance.now() < untilMs);
  const [first, last] = [reads[0], reads[reads.length - 1]];
  throw new Error(
    `The ${target} model of the view ${tag} is not written after ${reads.length} reads in ${(last.monotonicTimeMs - first.monotonicTimeMs).toFixed(2)} ms of a wait of ${timeoutMs} ms: the first read has the model ${first.model.join()}, the last read has the model ${last.model.join()} and the presentation ${last.presentation.join()}.`
  );
}

export async function sampleOpacity(tag: number) {
  const { model, presentation, playbacks, monotonicTimeMs } = await sample(
    tag,
    'Opacity'
  );
  return {
    model: model[0],
    presentation: presentation[0],
    keys: playbacks.length,
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
  const { model, presentation, playbacks } = await sample(tag, 'Position');
  return {
    x: model[0],
    y: model[1],
    presentationX: presentation[0],
    keys: playbacks.length,
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

export const geometryTrackOf = ({ traceTarget, from, to }: Track) => ({
  target: traceTarget,
  moves: from !== to,
});

/** The cases with a native route: below API 29 no case that moves geometry. */
export const nativeCasesOf = <TCase extends { tracks: Track[] }>(
  cases: Record<string, TCase>
) =>
  Object.entries(cases).filter(
    ([, { tracks }]) =>
      PLAYS_MOVING_GEOMETRY || !movesGeometryOf(tracks.map(geometryTrackOf))
  );

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
  const { model, presentation, playbacks, monotonicTimeMs } = await sample(
    tag,
    sampleTarget
  );
  return {
    shown: presentation[0],
    model: model[0],
    keys: playbacks.length,
    timeMs: monotonicTimeMs,
  };
}

export type TrackReading = Awaited<ReturnType<typeof readTrack>>;

export const isNear = (value: number, expected: number, tolerance = 0.01) =>
  Math.abs(value - expected) < tolerance;

/**
 * The tolerance of `isNear` for a value at an end of a track: a position has
 * `LAID_OUT_TOLERANCE`, because Android rounds each edge to the pixel grid.
 */
export const endToleranceOf = ({ sampleTarget }: Pick<Track, 'sampleTarget'>) =>
  sampleTarget === 'Position' ? LAID_OUT_TOLERANCE : 0.01;

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

/**
 * A segment of a platform animation at one of its edges, and the value that it
 * holds there.
 */
export type EdgeHold = {
  value: number;
  /** The place of the segment in its animation. */
  segment: number;
  /** The times of the two keys of the segment. */
  keysMs: Band;
  easedProgress: number;
  side: 'start' | 'end';
};

/**
 * The edge hold of a platform animation at a time. `keysMs` has the times of
 * the keys of the animation, and a segment is from one key to the next. The
 * eased progress of a segment at a time is the part of the declared change of
 * the segment that the declared value has at that time. The segment holds its
 * start value while that progress is from 0 to `KEYFRAME_EDGE_HOLD`, and its
 * end value while it is from `1 - KEYFRAME_EDGE_HOLD` to 1: the measured
 * segments have no progress outside 0 to 1, so such a progress has no hold. A
 * time outside the keys has none. A segment with one declared value at its two
 * keys has none.
 */
export function edgeHoldAt(
  valueAt: (timeMs: number) => number,
  keysMs: number[],
  timeMs: number
): EdgeHold | undefined {
  const segment = keysMs.findIndex(
    (keyMs, key) => timeMs >= keyMs && timeMs < keysMs[key + 1]
  );
  if (segment < 0) {
    return undefined;
  }
  const keys = { from: keysMs[segment], to: keysMs[segment + 1] };
  const [from, to] = [valueAt(keys.from), valueAt(keys.to)];
  if (from === to) {
    return undefined;
  }
  const easedProgress = (valueAt(timeMs) - from) / (to - from);
  if (easedProgress >= 0 && easedProgress <= KEYFRAME_EDGE_HOLD) {
    return { value: from, segment, keysMs: keys, easedProgress, side: 'start' };
  }
  return easedProgress >= 1 - KEYFRAME_EDGE_HOLD && easedProgress <= 1
    ? { value: to, segment, keysMs: keys, easedProgress, side: 'end' }
    : undefined;
}

/**
 * The largest change of a declared value from one display frame before a time
 * to one display frame after it.
 */
export function declaredFrameChangeAt(
  valueAt: (timeMs: number) => number,
  timeMs: number
) {
  const value = valueAt(timeMs);
  return Math.max(
    ...frameWindowOf(timeMs, 1).map((stepTimeMs) =>
      Math.abs(valueAt(stepTimeMs) - value)
    )
  );
}

/**
 * The times from `framesBefore` display frames before a time to one display
 * frame after it, in steps of one eighth of a display frame.
 */
const frameWindowOf = (timeMs: number, framesBefore: number) =>
  Array.from(
    { length: 8 * framesBefore + 9 },
    (_, step) => timeMs + ((step - 8 * framesBefore) * FRAME_MS) / 8
  );

/**
 * One phase of a declared timeline: a move to `to`, or a hold when it has no
 * move.
 */
export type Phase = {
  durationMs: number;
  move?: { to: number; curve: EasingFunction };
  /** The declared delay of a hold. It can be negative. */
  delayMs?: number;
};

export type Timeline = {
  from: number;
  phases: Phase[];
  /** The unit of the values. A number has none. */
  unit: string;
};

export function amountOf(value: number | string) {
  if (typeof value === 'number') {
    return { amount: value, unit: '' };
  }
  const amount = parseFloat(value);
  return { amount, unit: value.replace(/^[-+]?[\d.]+(e[-+]?\d+)?/, '') };
}

/**
 * The timeline that a leaf of `layoutOf` declares between its start value and
 * its end value. A fitted easing has the curve of its function. `base` is the
 * target value of a layout key.
 */
export function declaredTimelineOf(
  leaf: Leaf,
  from: number | string,
  to: number | string,
  base?: number
): Timeline {
  const holdOf = (delayMs: number): Phase => ({
    durationMs: Math.max(0, delayMs),
    delayMs,
  });
  const { delays, timings } = planOf(leaf, from, to, base);
  return {
    from: amountOf(from).amount,
    unit: amountOf(to).unit,
    phases: [
      ...delays.map(holdOf),
      ...timings.flatMap(({ delay, duration, easing, to: end }) => [
        ...(delay === undefined ? [] : [holdOf(delay)]),
        {
          durationMs: duration,
          move: {
            to: amountOf(end).amount,
            curve:
              easing === 'default'
                ? DEFAULT_EASING.curve
                : curveOf(easing ?? Easing.linear),
          },
        },
      ]),
    ],
  };
}

/** The declared start of each phase, from the start of the animation. */
export function declaredStartsOf({ phases }: Timeline) {
  let startMs = 0;
  return phases.map(({ durationMs }) => {
    const phaseStartMs = startMs;
    startMs += durationMs;
    return phaseStartMs;
  });
}

export const declaredDurationOf = ({ phases }: Timeline) =>
  phases.reduce((sum, { durationMs }) => sum + durationMs, 0);

export function declaredEndOf({ from, phases }: Timeline) {
  const moves = phases.flatMap(({ move }) => (move ? [move] : []));
  return moves.length === 0 ? from : moves[moves.length - 1].to;
}

/**
 * The value of a timeline at a time from its start, for phases that start at
 * their declared times.
 */
export function declaredValueOf(timeline: Timeline) {
  const parts = partsOf(timeline);
  return (timeMs: number) => declaredValueAt(timeline.from, parts, timeMs);
}

function partsOf(timeline: Timeline) {
  const starts = declaredStartsOf(timeline);
  return timeline.phases.flatMap(({ durationMs, move }, phase): TimedPart[] =>
    move ? [{ ...move, durationMs, startMs: starts[phase] }] : []
  );
}

type TimedTrack = {
  /** The declared value at a time from the origin. */
  declared: (timeMs: number) => number;
  /**
   * The values that one read can show in place of the declared value at a time
   * from the origin, by `KEYFRAME_EDGE_HOLD`: the track has them only with the
   * samples of that read. The tracks of the cells of one matrix have one list:
   * the values of one place are of one matrix.
   */
  held?: (timeMs: number) => number[];
  /** The times from the origin at which a phase of the track starts. */
  edgesMs: number[];
  /** The start of the track on the sample clock. */
  origin: Band;
  /** From the start to the end of the track in the trace, on the sample clock. */
  played: Band;
  /**
   * The times from the origin at which the platform ended an animation of the
   * sample of the key by its own duration.
   */
  ownEndsMs?: number[];
  /**
   * The track that had the key before the start of this track in the trace.
   * Before that time the key has the declared value of the replaced track, as
   * if it played on.
   */
  replaced?: TimedTrack;
};

export type NativeTrack = TimedTrack & { tolerance: number };

type Replaceable<TTrack> = TimedTrack & { replaced?: TTrack };

/** The track that has the key of a track at a time of the sample clock. */
export function ownerAt<TTrack extends Replaceable<TTrack>>(
  track: TTrack,
  timeMs: number
): TTrack {
  return track.replaced && timeMs < track.played.from
    ? ownerAt(track.replaced, timeMs)
    : track;
}

/** The declared value of the key of a track at a time of the sample clock. */
export function declaredOf(track: TimedTrack, timeMs: number) {
  const owner = ownerAt(track, timeMs);
  return owner.declared(timeMs - middleOf(owner.origin));
}

/** The held values of the key of a track at a time of the sample clock. */
export function heldOf(track: TimedTrack, timeMs: number) {
  const owner = ownerAt(track, timeMs);
  return owner.held?.(timeMs - middleOf(owner.origin)) ?? [];
}

export type NativeResidual = {
  /** How far each value is from the declared values of one time of the band. */
  distances: number[];
  /** How long before the read that time is. */
  ageMs: number;
  /**
   * The smallest age found at which the values are on the timeline: how long
   * before the read the latest such time of the band is. `Infinity` if the
   * values are not on the timeline.
   */
  fitAgeMs: number;
  isOnTimeline: boolean;
  /**
   * The times that the read can show have the start of a track that replaced a
   * track.
   */
  crossesReplacement: boolean;
  /**
   * Of a read that is on the timeline only in the removal window of an end of
   * `ownEndsMs`: that end on the sample clock.
   */
  removalEndMs?: number;
  /**
   * Of a read that is on the timeline only by a held value: the time of the
   * sample clock at which it is.
   */
  edgeHoldMs?: number;
  /** The read is on the timeline only by `asReplacedTrack` of its tracks. */
  showsReplaced?: boolean;
};

/** A read `READ_GAP_MS` or more after the read before of its target. */
export type ReadAfterGap = {
  gapMs: number;
  /** The presentation of the read before. */
  before: number[];
  /** The read has exactly the presentation of the read before. */
  isRepeated: boolean;
};

export function readAfterGapOf(
  { monotonicTimeMs, presentation }: TargetSample,
  before?: TargetSample
): ReadAfterGap | undefined {
  if (!before) {
    return undefined;
  }
  const gapMs = monotonicTimeMs - before.monotonicTimeMs;
  return gapMs < READ_GAP_MS
    ? undefined
    : {
        gapMs,
        before: before.presentation,
        isRepeated: presentation.every(
          (value, cell) => value === before.presentation[cell]
        ),
      };
}

/**
 * The values of one read are the declared values of the keys at one time of the
 * `PRESENTATION_STAY_MS` before the read, or the read is after a gap and
 * repeats the read before.
 */
export function expectNativeTimeline(
  values: number[],
  readTimeMs: number,
  tracks: NativeTrack[],
  afterGap?: ReadAfterGap,
  residual = nativeResidualOf(values, readTimeMs, tracks)
) {
  const row = values
    .map((value, track) => {
      const { origin } = tracks[track];
      return `${value.toFixed(4)} at ${(readTimeMs - origin.to).toFixed(2)}..${(readTimeMs - origin.from).toFixed(2)} ms is ${residual.distances[track].toFixed(4)} from the declared values of the frame before`;
    })
    .join(', ');
  expect(residual.isOnTimeline || afterGap?.isRepeated ? '' : row).toBe('');
  return residual;
}

/**
 * The residual of a read of a presentation value: in the band of the read, or
 * in the removal window after it.
 */
export function nativeResidualOf(
  values: number[],
  readTimeMs: number,
  tracks: NativeTrack[]
): NativeResidual {
  const { removalEndMs, ...band } = presentationBandOf(readTimeMs, tracks);
  const inBand = residualIn(band, values, readTimeMs, tracks);
  if (inBand.isOnTimeline || removalEndMs === undefined) {
    return inBand;
  }
  const inWindow = residualIn(
    { from: band.to, to: removalEndMs },
    values,
    readTimeMs,
    tracks
  );
  return inWindow.isOnTimeline
    ? {
        ...inWindow,
        crossesReplacement: inBand.crossesReplacement,
        removalEndMs,
      }
    : inBand;
}

/**
 * A track that replaced a track, read in its first `PRESENTATION_STAY_MS` and
 * before a read of its target showed it: in the display frame of the start the
 * platform shows the replaced animation until its next display tick (measured:
 * 13 of 13 stale first reads with no display tick after the start, 7 of 7 fresh
 * reads after one).
 */
export const isInReplacementWindow = (
  readTimeMs: number,
  startMs: number,
  hasShownTrack: boolean
) =>
  !hasShownTrack &&
  readTimeMs >= startMs &&
  readTimeMs - startMs < PRESENTATION_STAY_MS;

/** The replaced track of a track, with the tolerance of the track. */
const asReplacedTrack = (track: NativeTrack): NativeTrack =>
  track.replaced ? { ...track.replaced, tolerance: track.tolerance } : track;

/**
 * `nativeResidualOf` a read, and of a read in `isInReplacementWindow` also of
 * the replaced tracks up to the time of the read.
 */
export function readResidualOf(
  values: number[],
  readTimeMs: number,
  tracks: NativeTrack[],
  isInWindow: boolean
): NativeResidual {
  const own = nativeResidualOf(values, readTimeMs, tracks);
  if (own.isOnTimeline || !isInWindow) {
    return own;
  }
  const replaced = nativeResidualOf(
    values,
    readTimeMs,
    tracks.map(asReplacedTrack)
  );
  return replaced.isOnTimeline
    ? {
        ...replaced,
        crossesReplacement: own.crossesReplacement,
        showsReplaced: true,
      }
    : own;
}

/** The residual of values of a time against the `bandMs` before it. */
export const residualInBandOf = (
  values: number[],
  timeMs: number,
  tracks: NativeTrack[],
  bandMs: number
) => residualIn(possibleBandOf(timeMs, tracks, bandMs), values, timeMs, tracks);

function residualIn(
  band: Band,
  values: number[],
  readTimeMs: number,
  tracks: NativeTrack[]
): NativeResidual {
  const declared = nearestOf(values, tracks, band, false);
  const { distances, excess, timeMs, latestFitMs, isHeld } =
    declared.excess <= 1 ? declared : nearestOf(values, tracks, band, true);
  return {
    distances,
    ageMs: readTimeMs - timeMs,
    fitAgeMs: readTimeMs - latestFitMs,
    isOnTimeline: excess <= 1,
    edgeHoldMs: isHeld && excess <= 1 ? timeMs : undefined,
    crossesReplacement: tracks.some(
      ({ replaced, played }) =>
        replaced !== undefined && band.from < played.from
    ),
  };
}

/**
 * The time of a band at which the declared values are nearest to the values:
 * the nearest time of `possibleTimesOf`, then the nearest of the times around
 * it, in steps that halve `NARROWING_ROUNDS` times. `latestFitMs` is the latest
 * time found at which the values are on the timeline. With `hasHeld`, the
 * values of a time are the nearest of the declared values and of the held
 * values of each place, and declared values that are on the timeline are nearer
 * than held values: `isHeld` says that held values are the nearest.
 */
function nearestOf(
  values: number[],
  tracks: NativeTrack[],
  band: Band,
  hasHeld: boolean
) {
  const residualOf = (shown: number[], timeMs: number) => {
    const distances = values.map((value, track) =>
      Math.abs(value - shown[track])
    );
    const excess = Math.max(
      ...distances.map((distance, track) => distance / tracks[track].tolerance)
    );
    return { distances, excess, timeMs, isHeld: false };
  };
  type Residual = ReturnType<typeof residualOf>;
  const isDeclaredFit = ({ isHeld, excess }: Residual) =>
    !isHeld && excess <= 1;
  const nearerOf = (first: Residual, second: Residual) => {
    if (isDeclaredFit(first) !== isDeclaredFit(second)) {
      return isDeclaredFit(first) ? first : second;
    }
    return second.excess < first.excess ? second : first;
  };
  const residualAt = (timeMs: number) => {
    const declared = tracks.map((track) => declaredOf(track, timeMs));
    const held = hasHeld ? tracks.map((track) => heldOf(track, timeMs)) : [];
    const places = Math.max(0, ...held.map((ofTrack) => ofTrack.length));
    return Array.from({ length: places }, (_, place) => ({
      ...residualOf(
        declared.map((value, track) => held[track][place] ?? value),
        timeMs
      ),
      isHeld: true,
    })).reduce(nearerOf, residualOf(declared, timeMs));
  };
  let nearest: Residual = {
    distances: values.map(() => Infinity),
    excess: Infinity,
    timeMs: band.to,
    isHeld: false,
  };
  let latestFitMs = -Infinity;
  const take = (timeMs: number) => {
    const residual = residualAt(timeMs);
    nearest = nearerOf(nearest, residual);
    if (residual.excess <= 1) {
      latestFitMs = Math.max(latestFitMs, timeMs);
    }
  };
  possibleTimesOf(band, tracks).forEach(take);
  const bandStepMs = (band.to - band.from) / BAND_STEPS;
  let stepMs = bandStepMs;
  for (let round = 0; round < NARROWING_ROUNDS; round++) {
    stepMs /= 2;
    [nearest.timeMs + stepMs, nearest.timeMs - stepMs]
      .filter((timeMs) => timeMs >= band.from && timeMs <= band.to)
      .forEach(take);
  }
  stepMs = bandStepMs;
  for (let round = 0; round < NARROWING_ROUNDS; round++) {
    stepMs /= 2;
    const laterMs = latestFitMs + stepMs;
    if (
      laterMs >= band.from &&
      laterMs <= band.to &&
      residualAt(laterMs).excess <= 1
    ) {
      latestFitMs = laterMs;
    }
  }
  return { ...nearest, latestFitMs };
}

/**
 * The least and the largest value of a key that a read at a time can show, by
 * each rule of statement A in the order of `nativeResidualOf`. Each band has
 * the band before it.
 */
export type ShownBands = {
  /** The declared values of the times of `presentationBandOf`. */
  stay: Band;
  /** With the held values of these times. */
  edgeHold: Band;
  /** With the declared and the held values of the removal window. */
  removalWindow: Band;
};

const SHOWN_BANDS = ['stay', 'edgeHold', 'removalWindow'] as const;

/** The least and the largest value that a read at a time can show of a key. */
export const declaredBandOf = (track: TimedTrack, readTimeMs: number): Band =>
  stayBandsOf([track], readTimeMs)[0].removalWindow;

const CURVE_READ_STEP_MS = 1;

/**
 * The lowest and the highest curve value from `earliestMs` to `latestMs`, both
 * ends in.
 */
export function curveBandOf(
  valueAt: (timeMs: number) => number,
  earliestMs: number,
  latestMs: number
) {
  const values = [valueAt(latestMs)];
  for (
    let timeMs = earliestMs;
    timeMs < latestMs;
    timeMs += CURVE_READ_STEP_MS
  ) {
    values.push(valueAt(timeMs));
  }
  return { low: Math.min(...values), high: Math.max(...values) };
}

/**
 * The frame times from `origin` that a read in the band `read` of the sample
 * clock can show.
 */
export const frameTimesOf = (read: Band, origin: Band): Band => ({
  from: read.from - PRESENTATION_STAY_MS - origin.to,
  to: read.to - origin.from,
});

/** The band of the sample clock of a draw at `timeMs` of the draw clock. */
export const drawnBandOf = (timeMs: number, clockOffset: Band): Band => ({
  from: timeMs + clockOffset.from,
  to: timeMs + DRAW_TIME_STEP_MS + clockOffset.to,
});

/** For each band of `ShownBands`: a distance of a pair that the band gives. */
export type PairChanges = Record<keyof ShownBands, number>;

/**
 * The largest distance between a value of a key that a read at a time can show
 * and a declared value of the key in `frameWindowOf` that time.
 */
export function declaredPairChangeAt(
  track: TimedTrack,
  timeMs: number,
  framesBefore: number
): PairChanges {
  const [shown] = stayBandsOf([track], timeMs);
  const twin = frameWindowOf(timeMs, framesBefore).map((stepTimeMs) =>
    declaredOf(track, stepTimeMs)
  );
  const changeOf = (band: Band) =>
    Math.max(...twin.map((value) => farthestIn(band, value)));
  return {
    stay: changeOf(shown.stay),
    edgeHold: changeOf(shown.edgeHold),
    removalWindow: changeOf(shown.removalWindow),
  };
}

/**
 * `ShownBands` of each track of one sample for a read at a time: the values of
 * the band of `presentationBandOf` and of the removal window after it, which
 * are the times of `nativeResidualOf`.
 */
function stayBandsOf(tracks: TimedTrack[], readTimeMs: number): ShownBands[] {
  const { removalEndMs, ...band } = presentationBandOf(readTimeMs, tracks);
  const inBand = valueBandsIn(band, tracks);
  const inWindow =
    removalEndMs === undefined
      ? undefined
      : valueBandsIn({ from: band.to, to: removalEndMs }, tracks);
  return inBand.map(({ declared, shown }, place) => ({
    stay: declared,
    edgeHold: shown,
    removalWindow: inWindow
      ? {
          from: Math.min(shown.from, inWindow[place].shown.from),
          to: Math.max(shown.to, inWindow[place].shown.to),
        }
      : shown,
  }));
}

/**
 * The least and the largest declared value of each track at the times of a
 * band, and these with the held values of the track.
 */
function valueBandsIn(times: Band, tracks: TimedTrack[]) {
  const bands = tracks.map(() => ({
    declared: { from: Infinity, to: -Infinity },
    shown: { from: Infinity, to: -Infinity },
  }));
  for (const timeMs of possibleTimesOf(times, tracks)) {
    tracks.forEach((track, place) => {
      const { declared, shown } = bands[place];
      const value = declaredOf(track, timeMs);
      declared.from = Math.min(declared.from, value);
      declared.to = Math.max(declared.to, value);
      const held = heldOf(track, timeMs);
      shown.from = Math.min(shown.from, value, ...held);
      shown.to = Math.max(shown.to, value, ...held);
    });
  }
  return bands;
}

/** The largest distance of a value from a value of a band. */
const farthestIn = ({ from, to }: Band, value: number) =>
  Math.max(value - from, to - value);

/** The declared values of a key before a time of the sample clock and at it. */
export const declaredSidesOf = (track: TimedTrack, timeMs: number) => [
  declaredOf(track, timeMs - BEFORE_MS),
  declaredOf(track, timeMs),
];

/**
 * A value that the route took from a track is the declared value of the track
 * at the origin of the build that took it: the route computes it there, so the
 * times are that origin with the uncertainty of the origin of the track: no
 * time before it and no removal window.
 */
export function expectCapturedStart(capture: Capture) {
  const { track, value, timeMs } = capture;
  const {
    isOnTimeline,
    distances: [distance],
  } = capturedResidualOf(capture);
  expect(
    isOnTimeline
      ? ''
      : `The captured value ${value} of ${describeLeaf(track)} of the command ${track.generation} is ${distance.toFixed(4)} from the declared value of the track at the origin of the build, ${(timeMs - middleOf(track.origin)).toFixed(3)} ms after the origin of the track.`
  ).toBe('');
}

export const capturedResidualOf = ({ track, value, timeMs }: Capture) =>
  residualInBandOf([value], timeMs, [track], 0);

const BAND_STEPS = 64;
const NARROWING_ROUNDS = 8;
const BEFORE_MS = 1e-6;

const withReplacedOf = (track: TimedTrack): TimedTrack[] => [
  track,
  ...(track.replaced ? withReplacedOf(track.replaced) : []),
];

type PresentationBand = Band & {
  /**
   * An end of `ownEndsMs` at most `REMOVAL_LEAD_MS` after the band: the read
   * can show the declared values of each side of it.
   */
  removalEndMs?: number;
};

/**
 * The times of the sample clock that a read of a presentation value can show:
 * the `PRESENTATION_STAY_MS` before the read.
 */
function presentationBandOf(
  readTimeMs: number,
  tracks: TimedTrack[]
): PresentationBand {
  const band = possibleBandOf(readTimeMs, tracks, PRESENTATION_STAY_MS);
  const removalEnds = tracks
    .flatMap(({ origin, ownEndsMs = [] }) =>
      ownEndsMs.map((endMs) => middleOf(origin) + endMs)
    )
    .filter((endMs) => endMs > band.to && endMs - REMOVAL_LEAD_MS <= band.to);
  return {
    ...band,
    removalEndMs: removalEnds.length > 0 ? Math.max(...removalEnds) : undefined,
  };
}

/**
 * The times of the sample clock that values of a time can have: the `bandMs`
 * before it, with the uncertainty of the origins on each side.
 */
function possibleBandOf(
  timeMs: number,
  tracks: TimedTrack[],
  bandMs: number
): Band {
  const uncertaintyMs = Math.max(
    ...tracks.flatMap(withReplacedOf).map(({ origin }) => uncertaintyOf(origin))
  );
  return {
    from: timeMs - bandMs - uncertaintyMs,
    to: timeMs + uncertaintyMs,
  };
}

/**
 * The times of a band, the latest first: equal steps, the two sides of each
 * phase edge, and the two sides of the start of each track that replaced a
 * track.
 */
function possibleTimesOf({ from, to }: Band, tracks: TimedTrack[]) {
  const edges = tracks
    .flatMap(withReplacedOf)
    .flatMap(({ edgesMs, origin, played, replaced }) => [
      ...edgesMs.map((edgeMs) => middleOf(origin) + edgeMs),
      ...(replaced ? [played.from] : []),
    ])
    .filter((edgeMs) => edgeMs > from && edgeMs <= to);
  return [
    ...Array.from(
      { length: BAND_STEPS + 1 },
      (_, step) => from + ((to - from) * step) / BAND_STEPS
    ),
    ...edges,
    ...edges.map((edgeMs) => edgeMs - BEFORE_MS),
  ].sort((first, second) => second - first);
}

export const middleOf = ({ from, to }: Band) => (from + to) / 2;

/** Each choice of one item of each list. The first has the first items. */
export const choicesOf = <TItem,>(lists: TItem[][]) =>
  lists.reduce<TItem[][]>(
    (choices, list) =>
      choices.flatMap((choice) => list.map((item) => [...choice, item])),
    [[]]
  );

export const uncertaintyOf = ({ from, to }: Band) => (to - from) / 2;

/** The property of the shadow tree of each layout key. */
export const LAYOUT_PROPS = {
  originX: 'left',
  originY: 'top',
  width: 'width',
  height: 'height',
} as const;

export type LayoutKey = keyof typeof LAYOUT_PROPS;

export const LAYOUT_KEYS = Object.keys(LAYOUT_PROPS) as LayoutKey[];

export type LaidOutValues = Record<LayoutKey, number>;

/**
 * A laid-out value is a whole number of pixels; the shadow tree gives it with
 * float noise (measured: 49.90477 and 49.904755 for 131 px at 2.625).
 */
export const onPixelGrid = (value: number) =>
  Math.round(value * PixelRatio.get()) / PixelRatio.get();

export async function laidOutValuesOf(refName: string): Promise<LaidOutValues> {
  const component = getTestComponent(refName);
  const values: Partial<LaidOutValues> = {};
  for (const key of LAYOUT_KEYS) {
    values[key] = onPixelGrid(
      Number(await component.getAnimatedStyle(LAYOUT_PROPS[key]))
    );
  }
  return values as LaidOutValues;
}

export const shadowLayoutsOf = async () => ({
  native: await laidOutValuesOf(BOX_REF),
  frame: await laidOutValuesOf(FRAME_BOX_REF),
});

export type BoxLayouts = Awaited<ReturnType<typeof shadowLayoutsOf>>;

/**
 * The position of the mounted parent of a box at rest: its `Position` model
 * minus the layer position of its laid-out values.
 */
export async function mountOffsetOf(tag: number, refName: string) {
  const [position, laidOut] = await Promise.all([
    sample(tag, 'Position'),
    laidOutValuesOf(refName),
  ]);
  return {
    x: position.model[0] - layerPositionOf(laidOut.originX, laidOut.width),
    y: position.model[1] - layerPositionOf(laidOut.originY, laidOut.height),
  };
}

/**
 * The position of a layer on one axis for an origin and a size of its box: the
 * anchor point of the layer is its center.
 */
export const layerPositionOf = (origin: number, size: number) =>
  origin + size / 2;

type DeclaredLeaf = LeafPlace & {
  leaf: Leaf;
  from: number | string;
  to: number | string;
  /** The target value of a layout key. */
  base?: number;
  /** The key shows its end value from the start, with no animation. */
  isPlain?: boolean;
  /**
   * The view shows `from` before the command. A track of a key with another
   * start value that replaces no track has a gate: a read can show the value
   * before the command for `PRESENTATION_STAY_MS` after the start of the
   * track.
   */
  startsOnScreen: boolean;
};

export type ScalarKey = DeclaredLeaf & {
  operation?: undefined;
  /** The target of the key in the trace and in a sample. */
  target: string;
  tolerance: number;
  /**
   * Of a position key: the size key of its axis, and the size of the box at
   * rest after the commit. A sample of a position target is `layerPositionOf`
   * the origin and the size of one time.
   */
  size?: { key: string; rest: number };
};

/**
 * An operation of a transform. Its native track starts at the initial value of
 * its builder: an operation with no initial value has no native track
 * (`summarizeTransformLeaf` of the package).
 */
export type OperationKey = DeclaredLeaf & {
  operation: number;
  target: 'Transform';
  startsOnScreen: false;
};

export type DeclaredKey = ScalarKey | OperationKey;

export function isSameLeaf(first: LeafPlace, second: LeafPlace) {
  'worklet';
  return first.key === second.key && first.operation === second.operation;
}

export const describeLeaf = ({ key, operation }: LeafPlace) =>
  operation === undefined ? key : `${key} ${operation}`;

export type PlayedTrack = DeclaredKey &
  TimedTrack & {
    /** The key of the test that the track plays. */
    declaration: DeclaredKey;
    generation: number;
    timeline: Timeline;
    /**
     * The time of the platform animations of the target of the track, from the
     * origin. Absent when the platform has no animation with a duration for
     * it.
     */
    playback?: Band;
    finished?: boolean;
    replaced?: PlayedTrack;
    /**
     * The value that the route took from the replaced track for the build of
     * the command: the start value of the track.
     */
    captured?: Capture;
    /** No read before this time of the sample clock is checked. */
    checkedFromMs: number;
    /** No read from this time of the sample clock is checked. */
    checkedToMs?: number;
  };

export type ScalarTrack = PlayedTrack & ScalarKey;
type OperationTrack = PlayedTrack & OperationKey;

const isOperationTrack = (track: PlayedTrack): track is OperationTrack =>
  track.operation !== undefined;

export const isScalarTrack = (track: PlayedTrack): track is ScalarTrack =>
  track.operation === undefined;

/**
 * The tracks of a native command, from its events and from the keys that the
 * test declares for it. A track of a key that starts on screen and replaces a
 * track of `replaced` starts at the value that the route captured from the
 * replaced track for the build of the command. It replaces the last track of
 * its key, when that track did not play to its end.
 */
export function playedTracksOf(
  events: TraceEvent[],
  command: CommandHandle,
  clockOffset: Band,
  keys: DeclaredKey[],
  replaced: PlayedTrack[] = []
): PlayedTrack[] {
  const origin = nativeOriginOf(events, command, clockOffset);
  const played = keys.map((declared) => {
    const ofTarget = events.filter(({ target }) => target === declared.target);
    const startedMs = requireEvent(
      ofTarget,
      command,
      'TrackStarted'
    ).monotonicTimeMs;
    const ended = ofTarget.find(
      (event) => event.event === 'TrackEnded' && isOfCommand(event, command)
    );
    const lastTrack = replaced.find((track) => isSameLeaf(track, declared));
    const replacedTrack = lastTrack?.finished ? undefined : lastTrack;
    const captured =
      declared.startsOnScreen && replacedTrack
        ? lastCaptureOf(events, replacedTrack, startedMs, clockOffset)
        : undefined;
    const timeline = declaredTimelineOf(
      declared.leaf,
      captured?.value ?? declared.from,
      declared.to,
      declared.base
    );
    return {
      ...declared,
      declaration: declared,
      generation: command.generation,
      origin,
      timeline,
      declared: declaredValueOf(timeline),
      edgesMs: declaredStartsOf(timeline),
      played: { from: startedMs, to: ended?.monotonicTimeMs ?? Infinity },
      ownEndsMs: ended?.finished ? [declaredDurationOf(timeline)] : [],
      finished: ended?.finished,
      replaced: replacedTrack,
      captured,
      checkedFromMs:
        declared.startsOnScreen || replacedTrack
          ? -Infinity
          : startedMs + PRESENTATION_STAY_MS,
    };
  });
  return played.map((track) => ({
    ...track,
    playback: playbackOf(
      played
        .filter(({ target }) => target === track.target)
        .map(({ timeline }) => timeline)
    ),
  }));
}

/**
 * The time of the platform animations of the timelines of one target of one
 * command, from their origin: from the first start of a move with a duration to
 * the last declared end (`timelineOf` and `extentOf` of `nativeLeaves.ts` of
 * the package, `makeAnimation` of `REANativeAnimationPlatform.mm`).
 */
function playbackOf(timelines: Timeline[]): Band | undefined {
  const extents = timelines.flatMap((timeline): Band[] => {
    const first = timeline.phases.findIndex(
      ({ move, durationMs }) => move !== undefined && durationMs > 0
    );
    return first < 0
      ? []
      : [
          {
            from: declaredStartsOf(timeline)[first],
            to: declaredDurationOf(timeline),
          },
        ];
  });
  return extents.length > 0
    ? {
        from: Math.min(...extents.map(({ from }) => from)),
        to: Math.max(...extents.map(({ to }) => to)),
      }
    : undefined;
}

export type Samples = Record<string, TargetSample>;

/** The samples of no read: a track with them has no held value. */
export const NO_HOLD: Samples = {};

/**
 * `edgeHoldAt` of the platform animation of a track in the samples of one read
 * of its view, at a time from the origin of the track. The keys of the
 * animation are the key times of its member in the sample of its target: the
 * first member of a scalar target, and for an operation the member of its place
 * from the last one (`makeTransformMembers` of `REANativeAnimationPlatform.mm`
 * gives the last operation first, after one member that hides the model). A
 * layer at rest has no member and no hold.
 */
export function edgeHoldOf(
  { target, operation, playback, declared }: PlayedTrack,
  samples: Samples
) {
  const members = samples[target]?.members ?? [];
  const member =
    operation === undefined || !PLAYS_CORE_ANIMATION_MEMBERS
      ? members[operation ?? 0]
      : members[members.length - 1 - operation];
  const keysMs =
    playback && member && PLAYS_CORE_ANIMATION_MEMBERS
      ? member.keyTimes.map(
          (keyTime) => playback.from + keyTime * (playback.to - playback.from)
        )
      : [];
  return (timeMs: number) => edgeHoldAt(declared, keysMs, timeMs);
}

function heldValuesOf(track: PlayedTrack, samples: Samples) {
  const holdAt = edgeHoldOf(track, samples);
  return (timeMs: number) => {
    const hold = holdAt(timeMs);
    return hold ? [hold.value] : [];
  };
}

/** `EdgeHold` of a track of a read at a time from the origin of the track. */
export type KeyHold = EdgeHold & { track: PlayedTrack; fromOriginMs: number };

/**
 * The edge hold of each key of a read at a time of the sample clock: of the
 * tracks that play, and of the size track of each position key of them.
 */
function keyHoldsAt(
  playing: PlayedTrack[],
  tracks: PlayedTrack[],
  samples: Samples,
  timeMs: number
): KeyHold[] {
  return [
    ...playing,
    ...playing.filter(isScalarTrack).flatMap(({ size }) => {
      const sizeTrack = size && lastSizeTrackOf(tracks, size);
      return sizeTrack ? [sizeTrack] : [];
    }),
  ].flatMap((track) => {
    const fromOriginMs = timeMs - middleOf(track.origin);
    const hold =
      ownerAt(track, timeMs) === track
        ? edgeHoldOf(track, samples)(fromOriginMs)
        : undefined;
    return hold ? [{ ...hold, track, fromOriginMs }] : [];
  });
}

/**
 * A value that the route took from a live track for the build of a commit, with
 * the track alone: the route computes the value from the timeline of that track
 * at the origin of the build.
 */
export type Capture = {
  track: ScalarTrack;
  value: number;
  /** The origin of the build on the sample clock. */
  timeMs: number;
  /** The time of the trace event of the capture. */
  eventTimeMs: number;
};

function lastCaptureOf(
  events: TraceEvent[],
  track: PlayedTrack,
  untilMs: number,
  clockOffset: Band
) {
  const captures = capturesOf(events, [track], clockOffset, () => {
    throw new Error(
      `The build that took ${describeLeaf(track)} of the command ${track.generation} started no native command.`
    );
  }).filter(({ eventTimeMs }) => eventTimeMs <= untilMs);
  if (captures.length === 0) {
    throw new Error(
      `The trace has no captured value of ${describeLeaf(track)} of the command ${track.generation} before its replacement.`
    );
  }
  return captures[captures.length - 1];
}

/**
 * The captures of the tracks in the events. The capture of a `Transform` track
 * has no value. The time of a capture is the origin of its build: the origin of
 * the native command that the build started in the transaction of the capture,
 * or `frameDriverOriginOf` the track when the build went to the frame driver.
 */
export const capturesOf = (
  events: TraceEvent[],
  tracks: PlayedTrack[],
  clockOffset: Band,
  frameDriverOriginOf: (track: ScalarTrack) => number
) =>
  events.flatMap((captured): Capture[] => {
    const { event, target, generation, leafValue, tag } = captured;
    const track = tracks
      .filter(isScalarTrack)
      .find((each) => each.target === target && each.generation === generation);
    if (event !== 'LayoutLeafCaptured' || leafValue === undefined || !track) {
      return [];
    }
    const command = events.find(
      (started) =>
        started.event === 'LayoutStartPending' &&
        started.tag === tag &&
        started.transactionNumber === captured.transactionNumber
    );
    return [
      {
        track: { ...track, replaced: undefined },
        value: leafValue,
        timeMs: command
          ? middleOf(nativeOriginOf(events, command, clockOffset))
          : frameDriverOriginOf(track),
        eventTimeMs: captured.monotonicTimeMs,
      },
    ];
  });

export type MatrixTolerance = { cells: number; translation: number };

export type NativeRead = {
  target: string;
  tracks: PlayedTrack[];
  timeMs: number;
  values: number[];
  checked: NativeTrack[];
  residual: NativeResidual;
  /** Of a read with `edgeHoldMs`: the edge hold of each of its keys there. */
  edgeHolds: KeyHold[];
  afterGap?: ReadAfterGap;
  /** False for a read before `checkedFromMs` of a track: it has no assertion. */
  isChecked: boolean;
};

/**
 * `expectNativeReads` of each sample row of one view, in order: each row gets
 * the rows before it, for the tracks that replaced a track and that an earlier
 * read showed.
 */
export function expectNativeReadRows(
  rows: Samples[],
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance
): NativeRead[][] {
  const shown = new Set<PlayedTrack>();
  return rows.map((samples, index) => {
    const reads = expectNativeReads(
      samples,
      tracks,
      matrixTolerance,
      rows[index - 1],
      shown
    );
    reads.flatMap(shownReplacingTracksOf).forEach((track) => shown.add(track));
    return reads;
  });
}

/**
 * Each sample of one view is on the keys of the tracks that play at its time. A
 * sample of the `Transform` target is checked as the cells of its matrix.
 * `before` has the samples of the view directly before these, and `shown` the
 * tracks that replaced a track and that an earlier read showed.
 */
function expectNativeReads(
  samples: Samples,
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance,
  before: Samples | undefined,
  shown: ReadonlySet<PlayedTrack>
): NativeRead[] {
  return Object.entries(samples).flatMap(([target, targetSample]) => {
    const { presentation, monotonicTimeMs: timeMs } = targetSample;
    const playing = playingTracksOf(tracks, target, timeMs);
    if (playing.length === 0) {
      return [];
    }
    const isTransform = playing.some(isOperationTrack);
    const values = isTransform
      ? TRANSFORM_SAMPLE_CELLS.map((cell) => presentation[cell])
      : playing.map(() => presentation[0]);
    const shownTracks = shownTracksOf(
      playing,
      tracks,
      matrixTolerance,
      layerOf(targetSample),
      samples
    );
    const checked = isTransform
      ? TRANSFORM_SAMPLE_CELLS.map((cell) => shownTracks[cell])
      : shownTracks;
    const isChecked =
      checkedTracksOf(tracks, target, timeMs).length === playing.length;
    const afterGap = readAfterGapOf(targetSample, before?.[target]);
    const isInWindow = playing.some(
      (track) =>
        track.replaced !== undefined &&
        isInReplacementWindow(timeMs, track.played.from, shown.has(track))
    );
    const residual = readResidualOf(values, timeMs, checked, isInWindow);
    if (isChecked) {
      expectNativeTimeline(values, timeMs, checked, afterGap, residual);
    }
    return [
      {
        target,
        tracks: playing,
        timeMs,
        values,
        checked,
        residual,
        edgeHolds:
          residual.edgeHoldMs === undefined
            ? []
            : keyHoldsAt(playing, tracks, samples, residual.edgeHoldMs),
        afterGap,
        isChecked,
      },
    ];
  });
}

/** The tracks that replaced a track and that a read shows. */
const shownReplacingTracksOf = ({ tracks, timeMs, residual }: NativeRead) =>
  residual.isOnTimeline && !residual.showsReplaced
    ? tracks.filter(
        ({ replaced, played }) =>
          replaced !== undefined && timeMs - residual.ageMs >= played.from
      )
    : [];

const playingTracksOf = (
  tracks: PlayedTrack[],
  target: string,
  timeMs: number
) =>
  tracks.filter(
    (track) =>
      track.target === target &&
      timeMs >= track.played.from &&
      timeMs < track.played.to
  );

export const checkedTracksOf = (
  tracks: PlayedTrack[],
  target: string,
  timeMs: number
) =>
  playingTracksOf(tracks, target, timeMs).filter(
    ({ checkedFromMs, checkedToMs = Infinity }) =>
      timeMs >= checkedFromMs && timeMs < checkedToMs
  );

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const TRANSLATION_CELLS = [12, 13, 14];
const PERSPECTIVE_CELL = 11;

export const cellToleranceOf = (
  cell: number,
  { cells, translation }: MatrixTolerance
) => (TRANSLATION_CELLS.includes(cell) ? translation : cells);

/** The value of one transform operation. A `matrix` operation has its cells. */
export type OperationValue =
  | { kind: string; amount: number; unit: string }
  | { kind: 'matrix'; cells: number[] };

/** The cells of the matrix of one transform operation: cell 4 * row + column. */
function operationCellsOf(operation: OperationValue) {
  if ('cells' in operation) {
    return operation.cells;
  }
  const { kind, amount, unit } = operation;
  const cells = [...IDENTITY];
  const radians = unit === 'deg' ? (amount * Math.PI) / 180 : amount;
  const rotate = (first: number, second: number) => {
    cells[5 * first] = cells[5 * second] = Math.cos(radians);
    cells[4 * first + second] = Math.sin(radians);
    cells[4 * second + first] = -Math.sin(radians);
  };
  switch (kind) {
    case 'translateX':
      cells[12] = amount;
      break;
    case 'translateY':
      cells[13] = amount;
      break;
    case 'scale':
      cells[0] = cells[5] = cells[10] = amount;
      break;
    case 'scaleX':
      cells[0] = amount;
      break;
    case 'scaleY':
      cells[5] = amount;
      break;
    case 'rotate':
    case 'rotateZ':
      rotate(0, 1);
      break;
    case 'rotateX':
      rotate(1, 2);
      break;
    case 'rotateY':
      rotate(2, 0);
      break;
    case 'perspective':
      cells[PERSPECTIVE_CELL] = -1 / amount;
      break;
    default:
      throw new Error(`The kit has no matrix of the operation ${kind}.`);
  }
  return cells;
}

function cellsProductOf(first: number[], second: number[]) {
  const product: number[] = [];
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      let sum = 0;
      for (let index = 0; index < 4; index++) {
        sum += first[4 * row + index] * second[4 * index + column];
      }
      product.push(sum);
    }
  }
  return product;
}

export type Layer = 'playing' | 'rest';

/** The layer of a sample has an animation of its target, or it is at rest. */
export const layerOf = ({ members }: TargetSample): Layer =>
  members.length > 0 ? 'playing' : 'rest';

/**
 * The cells of a `Transform` sample for the values of the operations of a
 * style. The presentation layer of a native track that plays has the product of
 * the operations in the other order than a layer at rest.
 */
export function cellsOf(operations: OperationValue[], layer: Layer) {
  return orderedOf(operations, layer)
    .map(operationCellsOf)
    .reduce(cellsProductOf, IDENTITY);
}

/**
 * The operations of a style in the order of the product of a layer. The Android
 * writer composes the model order also while it plays.
 */
const orderedOf = <TOperation,>(operations: TOperation[], layer: Layer) =>
  layer === 'rest' || !PLAYS_CORE_ANIMATION_MEMBERS
    ? [...operations].reverse()
    : operations;

/** The cells of a `Transform` sample of a view at rest at the end of operations. */
export const endCellsOf = (operations: Operation[]) =>
  cellsOf(
    operations.map(([kind, , to]): OperationValue => {
      if (typeof to !== 'object') {
        return { kind, ...amountOf(to) };
      }
      if (kind !== 'matrix') {
        throw new Error(`The kit has no matrix of the operation ${kind}.`);
      }
      return { kind, cells: SHOWS_MATRIX_SHEAR ? to : withoutShearOf(to) };
    }),
    'rest'
  );

/**
 * The cells of a 2D matrix with no shear, as the decomposition of React Native
 * gives them: the second row loses its part along the first row.
 */
function withoutShearOf(cells: number[]) {
  const scaleX = Math.hypot(cells[0], cells[1]);
  const shear = (cells[0] * cells[4] + cells[1] * cells[5]) / scaleX;
  const shown = [...cells];
  shown[4] -= (shear * cells[0]) / scaleX;
  shown[5] -= (shear * cells[1]) / scaleX;
  return shown;
}

/**
 * The cells of a `Transform` sample of a layer for an amount of each of the
 * operation tracks of one command, in the order of the style.
 */
const amountCellsOf =
  (operations: PlayedTrack[], layer: Layer) => (amounts: number[]) =>
    cellsOf(
      operations.map(({ key, timeline: { unit } }, operation) => ({
        kind: key,
        amount: amounts[operation],
        unit,
      })),
      layer
    );

/** A function of a time that keeps the value of its last time. */
function lastValueOf<TValue>(valueAt: (timeMs: number) => TValue) {
  let last: { timeMs: number; value: TValue } | undefined;
  return (timeMs: number) => {
    if (last?.timeMs !== timeMs) {
      last = { timeMs, value: valueAt(timeMs) };
    }
    return last.value;
  };
}

/**
 * The largest distance of each cell of a `Transform` sample of a layer for the
 * operation tracks of one command, between the cells that a read at a time of
 * the sample clock can show and the cells of the frame driver. The read shows
 * the cells of one time of `stayBandsOf` for all the operations. The frame
 * driver has each operation at a time of its own in `frameWindowOf` with
 * `framesBeforeOf` it: the distance is the largest over each choice of these
 * times. `samples` are of the read.
 */
export function operationPairChangesAt(
  operations: PlayedTrack[],
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance,
  layer: Layer,
  timeMs: number,
  framesBeforeOf: (operation: PlayedTrack) => number,
  samples: Samples
): PairChanges[] {
  const shown = stayBandsOf(
    transformTracksOf(
      operations.filter(isOperationTrack),
      tracks,
      matrixTolerance,
      layer,
      samples
    ),
    timeMs
  );
  const ordered = orderedOf(operations, layer);
  const cellsOfAmount = (operation: PlayedTrack, amount: number) =>
    operationCellsOf({
      kind: operation.key,
      amount,
      unit: operation.timeline.unit,
    });
  const steps = ordered.map((operation) => {
    const amounts = new Set(
      frameWindowOf(timeMs, framesBeforeOf(operation)).map((stepTimeMs) =>
        declaredOf(operation, stepTimeMs)
      )
    );
    return [...amounts].map((amount) => cellsOfAmount(operation, amount));
  });
  const largest = shown.map(
    (): PairChanges => ({ stay: 0, edgeHold: 0, removalWindow: 0 })
  );
  const take = (product: number[], place: number) => {
    if (place < steps.length) {
      for (const cells of steps[place]) {
        take(cellsProductOf(product, cells), place + 1);
      }
      return;
    }
    for (let cell = 0; cell < largest.length; cell++) {
      for (const band of SHOWN_BANDS) {
        largest[cell][band] = Math.max(
          largest[cell][band],
          farthestIn(shown[cell][band], product[cell])
        );
      }
    }
  };
  take(IDENTITY, 0);
  return largest;
}

/**
 * The tracks of the values of one sample of the target of `playing`, which are
 * the tracks of one target that play at one time: one track for each cell of a
 * `Transform` sample of a layer, or the track of the sample of each scalar key.
 * `samples` are of the read of the sample.
 */
function shownTracksOf(
  playing: PlayedTrack[],
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance,
  layer: Layer,
  samples: Samples
): NativeTrack[] {
  const operations = playing.filter(isOperationTrack);
  return operations.length > 0
    ? transformTracksOf(operations, tracks, matrixTolerance, layer, samples)
    : playing
        .filter(isScalarTrack)
        .map((track) => shownTrackOf(track, tracks, samples));
}

/**
 * The track of a scalar key in the value of a sample of its target. The sample
 * of a position key has the origin and the size of one time. Each of the two
 * keys has its own owner at that time: the size is the declared value of the
 * track that has the size key then, of the command of the position track or of
 * another command, or the size at rest when the size key has no track. The
 * track has held values only with the samples of one read of the view, for the
 * animations of that read: a replaced track has none.
 */
export function shownTrackOf(
  track: ScalarTrack,
  tracks: PlayedTrack[],
  samples: Samples
): NativeTrack {
  const { size, origin, replaced } = track;
  const held = heldValuesOf(track, samples);
  if (!size) {
    return { ...track, held };
  }
  const sizeTracks = sizeTracksOf(tracks, size);
  const lastSizeTrack = lastSizeTrackOf(tracks, size);
  const heldSizeTrack = lastSizeTrack && {
    ...lastSizeTrack,
    held: heldValuesOf(lastSizeTrack, samples),
  };
  const originMs = middleOf(origin);
  const sizeAt = (timeMs: number) =>
    lastSizeTrack ? declaredOf(lastSizeTrack, originMs + timeMs) : size.rest;
  return {
    ...track,
    declared: (timeMs) =>
      layerPositionOf(track.declared(timeMs), sizeAt(timeMs)),
    held: (timeMs) =>
      choicesOf([
        [track.declared(timeMs), ...held(timeMs)],
        [
          sizeAt(timeMs),
          ...(heldSizeTrack ? heldOf(heldSizeTrack, originMs + timeMs) : []),
        ],
      ])
        .slice(1)
        .map(([position, extent]) => layerPositionOf(position, extent)),
    edgesMs: [
      ...track.edgesMs,
      ...sizeTracks
        .flatMap((sizeTrack) => [
          ...sizeTrack.edgesMs.map(
            (edgeMs) => middleOf(sizeTrack.origin) + edgeMs
          ),
          ...(sizeTrack.replaced ? [sizeTrack.played.from] : []),
        ])
        .map((edgeMs) => edgeMs - originMs),
    ],
    ownEndsMs: [
      ...(track.ownEndsMs ?? []),
      ...sizeTracks.flatMap((sizeTrack) =>
        (sizeTrack.ownEndsMs ?? []).map(
          (endMs) => middleOf(sizeTrack.origin) + endMs - originMs
        )
      ),
    ],
    replaced:
      replaced && isScalarTrack(replaced)
        ? shownTrackOf(replaced, tracks, NO_HOLD)
        : undefined,
  };
}

type SizeKey = NonNullable<ScalarKey['size']>;

const sizeTracksOf = (tracks: PlayedTrack[], size: SizeKey) =>
  tracks.filter(({ key }) => key === size.key);

/**
 * The track of the size of a sample of a position key: the last track of its
 * size key. The declared value of that track at a time is of the track that has
 * the size key then.
 */
function lastSizeTrackOf(
  tracks: PlayedTrack[],
  size: SizeKey
): PlayedTrack | undefined {
  const sizeTracks = sizeTracksOf(tracks, size);
  return sizeTracks[sizeTracks.length - 1];
}

/**
 * The value of a sample of the target of a key for a view at rest at a value of
 * the key.
 */
export const shownAtRestOf = ({ size }: ScalarKey, value: number) =>
  size ? layerPositionOf(value, size.rest) : value;

/**
 * One track for each cell of a `Transform` sample of a layer for the operation
 * tracks of one command. The cells of one read need one time of all the
 * operations: the tracks have the one origin of their command. A held matrix
 * has the held value of one operation or more, and the declared values of the
 * others, for the animations in the samples of one read: a replaced track has
 * none. The platform ends the animations of the command at the end of its
 * longest operation (`makeAnimation` of `REANativeAnimationPlatform.mm`). The
 * tracks that they replaced are the operation tracks of the command of the
 * replaced track.
 */
function transformTracksOf(
  operations: OperationTrack[],
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance,
  layer: Layer,
  samples: Samples
): NativeTrack[] {
  const cellsOfAmounts = amountCellsOf(operations, layer);
  const declaredAt = lastValueOf((timeMs: number) =>
    cellsOfAmounts(operations.map(({ declared }) => declared(timeMs)))
  );
  const holds = operations.map((operation) => heldValuesOf(operation, samples));
  const heldAt = lastValueOf((timeMs: number) =>
    choicesOf(
      operations.map(({ declared }, operation) => [
        declared(timeMs),
        ...holds[operation](timeMs),
      ])
    )
      .slice(1)
      .map(cellsOfAmounts)
  );
  const [{ origin, played, replaced }] = operations;
  const edgesMs = operations.flatMap((operation) => operation.edgesMs);
  const ownEndsMs = operations.flatMap(
    (operation) => operation.ownEndsMs ?? []
  );
  const replacedCells =
    replaced &&
    transformTracksOf(
      tracks
        .filter(isOperationTrack)
        .filter(({ generation }) => generation === replaced.generation),
      tracks,
      matrixTolerance,
      layer,
      NO_HOLD
    );
  return IDENTITY.map((_, cell) => ({
    declared: (timeMs: number) => declaredAt(timeMs)[cell],
    held: (timeMs: number) => heldAt(timeMs).map((cells) => cells[cell]),
    edgesMs,
    origin,
    played,
    ownEndsMs: ownEndsMs.length > 0 ? [Math.max(...ownEndsMs)] : [],
    replaced: replacedCells?.[cell],
    tolerance: cellToleranceOf(cell, matrixTolerance),
  }));
}

/**
 * A record of the frame driver with the timeline that its leaf declares, and
 * the check of the leaf whose animation the leaf of the record replaced.
 */
export type FrameCheck = {
  record: FrameRecord;
  timeline: Timeline;
  replaced?: FrameCheck;
};

export type FrameResidual = {
  distance: number;
  /** The computed start of the first phase on the animation clock. */
  startMs: number;
  /** `phaseStartsLateOf`. */
  startsLateMs: number[];
};

/**
 * The builder gets the layout values and the window size as 32-bit floats, and
 * one value can come from two of them (measured on Android: a first frame of
 * -391.2380828857422 for 20.190475463867188 minus 411.4285583496094, the 32-bit
 * form of 411.42857142857144; a width of 50.28572082519531 for the laid-out
 * 50.28571319580078, two 32-bit steps).
 */
const FLOAT32_EPSILON = 2 ** -21;

/**
 * Each frame of a record wrote the value that the frame driver gives to the
 * timeline at the time of the frame, in the unit of the timeline, after the
 * start of the record, to `tolerance` and the 32-bit precision of its largest
 * value.
 */
export function expectFrameTimeline(
  check: FrameCheck,
  tolerance: number
): FrameResidual {
  const { record, timeline } = check;
  const { values, starts } = replayOf(check);
  const distances = record.frames.map(({ value }, frame) => {
    const { amount, unit } = amountOf(value);
    return unit === timeline.unit ? Math.abs(amount - values[frame]) : Infinity;
  });
  const magnitude = Math.max(
    Math.abs(timeline.from),
    Math.abs(declaredEndOf(timeline)),
    ...values.map(Math.abs)
  );
  const offTimeline = record.frames.flatMap(({ timeMs, value }, frame) =>
    distances[frame] <= tolerance + magnitude * FLOAT32_EPSILON
      ? []
      : [
          `${value} at ${timeMs} ms is ${distances[frame]} from ${values[frame]}${timeline.unit}`,
        ]
  );
  expect(
    offTimeline.length === 0
      ? ''
      : [
          `${describeLeaf(record)} of ${record.box}: start call at ${record.start?.timeMs} ms, adopted start at ${record.adoptedStart?.timeMs} ms, computed phase starts at ${starts.join()} ms, first frames at ${record.frames
            .slice(0, 3)
            .map(({ timeMs }) => timeMs)
            .join()} ms`,
          ...offTimeline,
        ].join(', ')
  ).toBe('');
  return {
    distance: Math.max(0, ...distances),
    startMs: starts[0],
    startsLateMs: startsLateOf(starts, timeline),
  };
}

/**
 * How long after its declared start, from the start of the first phase, each
 * phase of a record that started has its computed start: the start that the
 * rules of `replayFrames` give it for the frame times of the record. The start
 * of a phase is not read from the frame driver.
 */
export const phaseStartsLateOf = (check: FrameCheck) =>
  startsLateOf(replayOf(check).starts, check.timeline);

function startsLateOf(starts: number[], timeline: Timeline) {
  const declaredStarts = declaredStartsOf(timeline);
  return starts.map(
    (startMs, phase) => startMs - starts[0] - declaredStarts[phase]
  );
}

function replayOf({ record, timeline, replaced }: FrameCheck): FrameReplay {
  const { box, start, adoptedStart, frames } = record;
  const startMs = (adoptedStart ?? start)?.timeMs;
  if (startMs === undefined) {
    throw new Error(
      `The record of ${describeLeaf(record)} of ${box} has no start.`
    );
  }
  return replayFrames(
    timeline,
    startMs,
    frames.map(({ timeMs }) => timeMs),
    replaced && replayedValueOf(replaced)
  );
}

/**
 * The value that the replay of a record has after its frame of the latest time
 * at or before a time. The frame times of a take-over are not in order: the
 * frame of the start call has the time of the animation clock, and the next
 * frames have earlier frame times (measured on Android).
 */
function replayedValueOf(check: FrameCheck) {
  const { frames } = check.record;
  const { values } = replayOf(check);
  return (timeMs: number) => {
    let latest: { timeMs: number; value: number } | undefined;
    frames.forEach((frame, index) => {
      if (
        frame.timeMs <= timeMs &&
        frame.timeMs >= (latest?.timeMs ?? -Infinity)
      ) {
        latest = { timeMs: frame.timeMs, value: values[index] };
      }
    });
    return latest?.value ?? check.timeline.from;
  };
}

type FrameReplay = { values: number[]; starts: number[] };

/**
 * The value that the frame driver writes for a timeline in each frame after a
 * start at a time, and the start of each phase that started. Code facts of
 * `packages/react-native-reanimated/src/animation`: a timing moves its start to
 * a frame that is before it (`timing` of `withTiming`); a delay starts its
 * animation in the first frame at or after its end, and the animation gets that
 * frame, and a frame with a time less than the delay after the start of the
 * delay does not run the animation (`delay` of `withDelay`); a sequence starts
 * its next animation in the frame in which the current one ends, and the next
 * one gets its first frame after that frame (`sequence` of `withSequence`); a
 * delay before the first move runs the animation that its animation replaced,
 * and the move starts at the value of the frame before it (`delay` of
 * `withDelay`). `replacedValueAt` is the value of the replaced animation after
 * its frame of a time.
 */
export function replayFrames(
  { from, phases }: Timeline,
  startMs: number,
  frameTimes: number[],
  replacedValueAt?: (timeMs: number) => number
): FrameReplay {
  const starts = [startMs];
  let value = from;
  let moveStart = from;
  let hasMoved = false;
  const values = frameTimes.map((timeMs) => {
    while (starts.length <= phases.length) {
      const phase = starts.length - 1;
      const { durationMs, move } = phases[phase];
      if (!move) {
        if (timeMs - starts[phase] < durationMs) {
          if (replacedValueAt && !hasMoved) {
            value = moveStart = replacedValueAt(timeMs);
          }
          break;
        }
        starts.push(timeMs);
        continue;
      }
      const delay = phases[phase - 1];
      if (
        delay &&
        !delay.move &&
        timeMs - starts[phase - 1] < (delay.delayMs ?? delay.durationMs)
      ) {
        break;
      }
      hasMoved = true;
      starts[phase] = Math.min(starts[phase], timeMs);
      const runtimeMs = timeMs - starts[phase];
      if (runtimeMs < durationMs) {
        value =
          moveStart +
          (move.to - moveStart) * move.curve(runtimeMs / durationMs);
        break;
      }
      value = moveStart = move.to;
      starts.push(timeMs);
      break;
    }
    return value;
  });
  return { values, starts: starts.slice(0, phases.length) };
}

export type FrameMatrix = { timeMs: number; cells: number[] };

/**
 * The cells of the `Transform` model of a box after each frame of the records
 * of its operations: each operation has the value of its last frame at or
 * before the frame, from its last record that has such a frame.
 */
export function frameMatricesOf(
  records: OperationFrameRecord[]
): FrameMatrix[] {
  const places = [...new Set(records.map(({ operation }) => operation))].sort(
    (first, second) => first - second
  );
  const times = [
    ...new Set(
      records.flatMap(({ frames }) => frames.map(({ timeMs }) => timeMs))
    ),
  ].sort((first, second) => first - second);
  return times.flatMap((timeMs): FrameMatrix[] => {
    const values = places.flatMap((place) =>
      lastFrameValueOf(
        records.filter(({ operation }) => operation === place),
        timeMs
      )
    );
    return values.length === places.length
      ? [{ timeMs, cells: cellsOf(values, 'rest') }]
      : [];
  });
}

function lastFrameValueOf(
  records: FrameRecord[],
  untilMs: number
): OperationValue[] {
  let last: { timeMs: number; value: OperationValue } | undefined;
  for (const { key, frames } of records) {
    for (const { timeMs, value } of frames) {
      if (timeMs <= untilMs && timeMs >= (last?.timeMs ?? -Infinity)) {
        last = { timeMs, value: { kind: key, ...amountOf(value) } };
      }
    }
  }
  return last ? [last.value] : [];
}

type PresentationRead = { monotonicTimeMs: number; presentation: number[] };

const ROW_INTERVAL_MS = 30;

export type TakenRow<TRow> = {
  row: TRow;
  /** The row is the first of a sampling cycle of `takeRows`. */
  opensCycle: boolean;
  /**
   * Of a row that shows a new value: the time from the read of the row before
   * it. A presentation value is of the time of the first read that shows it, so
   * the value of such a row is `spacingMs` old at most.
   */
  spacingMs?: number;
};

/**
 * The rows of `take` to a time, or to the time at which a view of `take`
 * leaves. Each `ROW_INTERVAL_MS` it takes rows until one shows a new value, for
 * two display frames at most.
 */
export async function takeRows<TRow>(
  take: () => Promise<TRow>,
  readOf: (row: TRow) => PresentationRead,
  untilMs: number
) {
  const rows: TakenRow<TRow>[] = [];
  const takeRead = async (opensCycle: boolean) => {
    const row = await take();
    rows.push({ row, opensCycle });
    return readOf(row);
  };
  try {
    let hasRead = false;
    while (performance.now() < untilMs) {
      let read = hasRead
        ? await takeRead(true)
        : await afterMountOf(() => takeRead(true));
      hasRead = true;
      const pollUntilMs = read.monotonicTimeMs + 2 * FRAME_MS;
      while (read.monotonicTimeMs < pollUntilMs) {
        const before = read;
        read = await takeRead(false);
        if (
          read.presentation.some(
            (value, cell) => value !== before.presentation[cell]
          )
        ) {
          rows[rows.length - 1].spacingMs =
            read.monotonicTimeMs - before.monotonicTimeMs;
          break;
        }
      }
      await wait(ROW_INTERVAL_MS);
    }
  } catch (error) {
    if (!isNoView(error)) {
      throw error;
    }
  }
  return rows;
}

/**
 * The first read of a view that a render added. On Android the view can mount
 * some frames after the render resolves, so a read with no view waits one frame
 * and reads again, up to `MOUNT_WAIT_FRAMES`.
 */
export async function afterMountOf<TRead>(read: () => Promise<TRead>) {
  for (let frame = 0; ; frame++) {
    try {
      return await read();
    } catch (error) {
      if (!isNoView(error) || frame === MOUNT_WAIT_FRAMES) {
        throw error;
      }
      await waitForFrames(1);
    }
  }
}

const MOUNT_WAIT_FRAMES = 10;

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

type AnimationFunction = (values: never) => LayoutAnimation;
type AnimationValues =
  | Parameters<EntryExitAnimationFunction>[0]
  | Parameters<LayoutAnimationFunction>[0];

export type AnimationSource =
  | { build: () => AnimationFunction }
  | AnimationFunction;
type BuiltLeaf = Partial<FrameAnimation> & { __nativeTiming?: unknown };
type LeafPlace = Pick<FrameRecord, 'key' | 'operation'>;

/**
 * The animation of a builder or of a function, with a call of `prepare` for
 * each leaf of each build.
 */
function withPreparedLeaves(
  animation: AnimationSource,
  prepare: (leaf: BuiltLeaf, place: LeafPlace, values: AnimationValues) => void
) {
  const build = (
    typeof animation === 'function' ? animation : animation.build()
  ) as (values: AnimationValues) => LayoutAnimation;
  return (values: AnimationValues) => {
    'worklet';
    const result = build(values);
    const leaves = Object.entries(result.animations).flatMap(([key, leaf]) =>
      Array.isArray(leaf)
        ? leaf.flatMap((entry: Record<string, unknown>, operation) =>
            Object.entries(entry).map(
              ([kind, operationLeaf]) =>
                [operationLeaf, { key: kind, operation }] as const
            )
          )
        : [[leaf, { key }] as const]
    );
    for (const [leaf, place] of leaves) {
      if (typeof leaf === 'object' && leaf !== null) {
        prepare(leaf as BuiltLeaf, place, values);
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
  current: number | string;
  /** Of a timing and of a delay. */
  startTime?: number;
  /** Of a timing. */
  startValue: number | string;
  onStart: (
    animation: FrameAnimation,
    value: number | string,
    now: number,
    previous: unknown
  ) => void;
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

const CLOCK_OFFSET_READS = 6;

/**
 * The step of the animation clock: Android reads `SystemClock.uptimeMillis()`
 * (`NativeProxy.getAnimationTimestamp`), so a read stands for each time of its
 * millisecond.
 */
const ANIMATION_CLOCK_STEP_MS = IS_APPLE ? 0 : 1;

async function readClockOffset(tag: number): Promise<Band> {
  const before = runOnUISync(animationTime);
  const { monotonicTimeMs } = await sample(tag, 'Transform');
  const after = runOnUISync(animationTime);
  return {
    from: monotonicTimeMs - after - ANIMATION_CLOCK_STEP_MS,
    to: monotonicTimeMs - before,
  };
}

/** The time of the sample clock minus the time of the animation clock. */
export async function sampleClockOffset(tag: number) {
  let best = { width: Infinity, offset: 0 };
  for (let attempt = 0; attempt < CLOCK_OFFSET_READS; attempt++) {
    const { from, to } = await readClockOffset(tag);
    if (to - from < best.width) {
      best = { width: to - from, offset: (from + to) / 2 };
    }
  }
  return best;
}

let clockOffsetOfRun: Band = { from: -Infinity, to: Infinity };

/**
 * The time of the sample clock minus the time of the animation clock. The two
 * clocks keep one difference in a run of the app, so each call makes the band
 * of the run narrower.
 */
export async function narrowClockOffset(tag: number) {
  for (let attempt = 0; attempt < CLOCK_OFFSET_READS; attempt++) {
    const read = await readClockOffset(tag);
    const narrowed = {
      from: Math.max(clockOffsetOfRun.from, read.from),
      to: Math.min(clockOffsetOfRun.to, read.to),
    };
    if (narrowed.from > narrowed.to) {
      throw new Error(
        `The clock offset ${read.from}..${read.to} ms of a read is outside the clock offset ${clockOffsetOfRun.from}..${clockOffsetOfRun.to} ms of the run.`
      );
    }
    clockOffsetOfRun = narrowed;
  }
  return clockOffsetOfRun;
}

/**
 * The origin of the timelines of a native command on the sample clock, from its
 * `Received` event.
 */
export function nativeOriginOf(
  events: TraceEvent[],
  command: CommandHandle,
  clockOffset: Band
): Band {
  const { originTimestampMs } = requireEvent(events, command, 'Received');
  if (originTimestampMs === undefined) {
    throw new Error(
      `The Received event of the command ${describeCommand(command)} has no origin.`
    );
  }
  return {
    from: originTimestampMs + clockOffset.from,
    to: originTimestampMs + clockOffset.to,
  };
}

export const playbackCountOf = (
  { playbacks }: TargetSample,
  generation: number
) => playbacks.filter((playback) => playback.generation === generation).length;

/**
 * The events of the trace until `isComplete` holds for them: the wait for the
 * evidence of a start or of an end. At its timeout it gives the events that it
 * has.
 */
export async function takeTraceUntil(
  isComplete: (events: TraceEvent[]) => boolean,
  timeoutMs = 3000
) {
  const events = await takeTrace();
  const deadline = performance.now() + timeoutMs;
  while (!isComplete(events) && performance.now() < deadline) {
    await wait(FRAME_MS);
    events.push(...(await takeTrace()));
  }
  return events;
}

export const takeTraceUntilSurfaceClosed = (surfaceId: number) =>
  takeTraceUntil(
    (events) =>
      events.some(
        (event) =>
          event.event === 'SurfaceClosed' && event.surfaceId === surfaceId
      ),
    1000
  );

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
/** When the React Native runtime got the last callback of each name. */
export const callbackTimes: Record<string, number> = {};
/** When the UI runtime gave it, on the animation clock. */
export const callbackEmissionTimes: Record<string, number> = {};

export function resetCallbacks() {
  callbacks.length = 0;
  for (const times of [callbackTimes, callbackEmissionTimes]) {
    for (const name of Object.keys(times)) {
      delete times[name];
    }
  }
}

/** The times of the last callback of a name since `resetCallbacks`. */
export function callbackTimeOf(name: string) {
  if (!(name in callbackTimes)) {
    throw new Error(`The record has no callback of ${name}.`);
  }
  return {
    receivedMs: callbackTimes[name],
    emittedMs: callbackEmissionTimes[name],
  };
}
export function recordCallback(
  name: string,
  finished: boolean,
  emittedAtMs: number
) {
  callbacks.push(`${name}:${finished}`);
  callbackTimes[name] = performance.now();
  callbackEmissionTimes[name] = emittedAtMs;
}

/** A callback of a layout animation that records its result under `name`. */
export const callbackOf = (name: string) => (finished: boolean) => {
  'worklet';
  scheduleOnRN(recordCallback, name, finished, global._getAnimationTimestamp());
};

/**
 * Waits until `callbacks` has each of `expected`, as `<name>:<finished>`, or
 * that count of callbacks. Two equal results are two callbacks. It gives what
 * is missing at its timeout, or no text.
 */
export const waitForCallbacks = (
  expected: string[] | number,
  timeoutMs?: number
) =>
  waitForNothingMissing(
    () =>
      typeof expected === 'number'
        ? missingCountOf(callbacks.length, expected, 'callbacks')
        : missingEntriesOf(callbacks, expected),
    timeoutMs
  );

/**
 * Waits until `namedBuilderCalls` has each name of `expected`, or until
 * `builderCalls` is that count. It gives what is missing at its timeout, or no
 * text.
 */
export const waitForBuilderCalls = (
  expected: string[] | number,
  timeoutMs?: number
) =>
  waitForNothingMissing(
    () =>
      typeof expected === 'number'
        ? missingCountOf(builderCalls, expected, 'builder calls')
        : missingEntriesOf(namedBuilderCalls, expected),
    timeoutMs
  );

async function waitForNothingMissing(
  missingOf: () => string[],
  timeoutMs = 3000
) {
  const deadline = performance.now() + timeoutMs;
  while (missingOf().length > 0 && performance.now() < deadline) {
    await wait(FRAME_MS);
  }
  return missingOf().join();
}

const missingCountOf = (count: number, expected: number, unit: string) =>
  count < expected ? [`${expected - count} of ${expected} ${unit}`] : [];

/** Two equal entries of `expected` need two entries of `received`. */
function missingEntriesOf(received: string[], expected: string[]) {
  const left = [...received];
  return expected.filter((entry) => {
    const index = left.indexOf(entry);
    if (index >= 0) {
      left.splice(index, 1);
    }
    return index < 0;
  });
}

export let builderCalls = 0;
/** The name of the layout of each builder call of a layout with a name. */
export const layoutBuilderCalls: string[] = [];
export function recordBuilderCall(name?: string) {
  builderCalls++;
  if (name !== undefined) {
    layoutBuilderCalls.push(name);
  }
}

export type Key =
  | 'originX'
  | 'originY'
  | 'opacity'
  | 'width'
  | 'height'
  | 'borderRadius';

/** One timing of a `withSequence` before the timing of a leaf. */
export type LeafPart = {
  duration?: number;
  easing?: EasingFunction | EasingFunctionFactory | 'default';
  /** A `withDelay` wrapper of the timing. */
  delay?: number;
  /** The timing has a callback when the leaf has none on each timing. */
  hasCallback?: boolean;
  /**
   * Where the timing ends between the start value of the leaf, at 0, and its
   * end value, at 1: the two are numbers.
   */
  level?: number;
  /**
   * Where the timing ends, when it has no `level`: a value, or an offset from
   * the target value of a layout key. No value: at the end value of the leaf.
   */
  to?: number | string;
};

export type Leaf = Pick<LeafPart, 'duration' | 'easing' | 'delay'> & {
  via?: LeafPart[];
  /** Each entry is one `withDelay` wrapper of the leaf, the outer one first. */
  delays?: number[];
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
  /**
   * A `withSpring` with no config and with a leaf callback: it has no native
   * form, so the frame driver plays it.
   */
  isFrameDrivenSpring?: boolean;
  /**
   * A `withSpring` with this config in place of the timing. It has a leaf
   * callback when the leaf has one.
   */
  spring?: WithSpringConfig;
  hasCallback?: boolean;
  reduceMotion?: ReduceMotion;
  /** The leaf exists only when the layout value of its key changes. */
  onlyWhenChanged?: boolean;
  /** The builder sets reduced motion on the animation after its creation. */
  setsReduceMotion?: boolean;
};

export const isSpringLeaf = (leaf: Leaf) => {
  'worklet';
  return leaf.isFrameDrivenSpring === true || leaf.spring !== undefined;
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

/**
 * Android refuses a moving 3D operation (`PLAYS_3D_OPERATIONS`); the describe
 * of 3D operations on such a platform has its fallback form.
 */
export const has3D = (operations: Operation[] = []) =>
  operations.some(([kind]) =>
    ['rotateX', 'rotateY', 'perspective'].includes(kind)
  );

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

type LeafValue = number | string | number[];
type CurrentValues = Pick<
  ExitAnimationsValues,
  'currentOriginX' | 'currentOriginY' | 'currentWidth' | 'currentHeight'
>;
type TargetValues = Pick<
  EntryAnimationsValues,
  'targetOriginX' | 'targetOriginY' | 'targetWidth' | 'targetHeight'
>;

function animationOf(
  leaves: Leaves,
  { name, initialOnlyKey, transform, blocksForMs = 0 }: LayoutOptions = {}
) {
  const callback = name === undefined ? undefined : callbackOf(name);
  return (values: CurrentValues | TargetValues): LayoutAnimation => {
    'worklet';
    scheduleOnRN(recordBuilderCall, name);
    blockUIThread(blocksForMs);
    const timingOf = (
      leaf: Leaf,
      { to, duration, easing, delay, hasCallback }: PlannedTiming
    ) => {
      'worklet';
      const config: Record<string, unknown> = {
        duration,
        reduceMotion: leaf.reduceMotion,
      };
      if (easing !== 'default') {
        config.easing = easing ?? Easing.linear;
      }
      const leafCallback =
        leaf.isFrameDrivenSpring || (hasCallback ?? leaf.hasCallback)
          ? () => {
              'worklet';
            }
          : undefined;
      const timing = isSpringLeaf(leaf)
        ? withSpring(to, leaf.spring, leafCallback)
        : withTiming(to, config, leafCallback);
      return delay === undefined ? timing : withDelay(delay, timing);
    };
    const leafOf = (
      from: unknown,
      to: LeafValue,
      leaf: Leaf,
      base?: number
    ) => {
      'worklet';
      const { delays, timings } = planOf(leaf, from, to, base);
      const parts = timings.map((timing) => timingOf(leaf, timing));
      let animation = parts.length === 1 ? parts[0] : withSequence(...parts);
      for (const delay of [...delays].reverse()) {
        animation = withDelay(delay, animation);
      }
      if (leaf.setsReduceMotion) {
        (animation as { reduceMotion?: boolean }).reduceMotion = true;
      }
      return animation;
    };
    const currentOf = (layout: CurrentValues): Record<string, number> => ({
      originX: layout.currentOriginX,
      originY: layout.currentOriginY,
      width: layout.currentWidth,
      height: layout.currentHeight,
    });
    const targetOf = (layout: TargetValues): Record<string, number> => ({
      originX: layout.targetOriginX,
      originY: layout.targetOriginY,
      width: layout.targetWidth,
      height: layout.targetHeight,
    });
    // A view that enters or leaves has the values of one layout.
    const current =
      'currentOriginX' in values ? currentOf(values) : targetOf(values);
    const target =
      'targetOriginX' in values ? targetOf(values) : currentOf(values);
    const initialValues: Record<string, unknown> = {};
    const animations: Record<string, unknown> = {};
    for (const key of Object.keys(leaves)) {
      const leaf = leaves[key as Key]!;
      if (leaf.onlyWhenChanged && current[key] === target[key]) {
        continue;
      }
      const isLayoutKey = key in target;
      const initial = leaf.initial === 'none' ? undefined : leaf.initial;
      const fromValue = isLayoutKey ? current[key] + (initial ?? 0) : initial;
      const toValue = isLayoutKey ? target[key] + (leaf.to ?? 0) : leaf.to!;
      if (leaf.initial !== 'none') {
        initialValues[key] = fromValue;
      }
      animations[key] = leafOf(
        fromValue,
        toValue,
        leaf,
        isLayoutKey ? target[key] : undefined
      );
    }
    if (transform) {
      if (!transform.hasNoInitialValue) {
        initialValues.transform = transform.operations.map(([kind, from]) => ({
          [kind]: from,
        }));
      }
      animations.transform = transform.operations.map(
        ([kind, from, to, leaf]) => ({
          [kind]: leaf?.isPlain
            ? to
            : leafOf(from, to, { ...transform.shared, ...leaf }),
        })
      );
    }
    if (initialOnlyKey) {
      initialValues[initialOnlyKey] = 1;
    }
    return { initialValues, animations, callback };
  };
}

export const layoutOf: (
  ...args: Parameters<typeof animationOf>
) => LayoutAnimationFunction = animationOf;

/**
 * `layoutOf` for a view that enters or leaves. An offset of a layout key is
 * from its value in the one layout of the view.
 */
export const entryExitOf: (
  ...args: Parameters<typeof animationOf>
) => EntryExitAnimationFunction = animationOf;

type PlannedTiming<TValue = LeafValue> = Pick<
  LeafPart,
  'easing' | 'delay' | 'hasCallback'
> & {
  to: TValue | number | string;
  duration: number;
};

/**
 * The `withDelay` wrappers of a leaf and the timings of its sequence, between
 * its start value and its end value. `layoutOf` builds them, and
 * `declaredTimelineOf` declares them. `base` is the target value of a layout
 * key.
 */
function planOf<TValue extends LeafValue>(
  leaf: Leaf,
  from: unknown,
  to: TValue,
  base = 0
): { delays: number[]; timings: PlannedTiming<TValue>[] } {
  'worklet';
  const endOf = (part: LeafPart) => {
    'worklet';
    if (part.level !== undefined) {
      if (typeof from !== 'number' || typeof to !== 'number') {
        throw new Error('A level is between two numbers.');
      }
      return from + (to - from) * part.level;
    }
    if (part.to === undefined) {
      return to;
    }
    return typeof part.to === 'number' ? base + part.to : part.to;
  };
  return {
    delays: leaf.delays ?? [],
    timings: [
      ...(leaf.via ?? []).map((part) => ({
        to: endOf(part),
        duration: part.duration ?? DURATION,
        easing: part.easing,
        delay: part.delay,
        hasCallback: part.hasCallback,
      })),
      {
        to,
        duration: leaf.duration ?? DURATION,
        easing: leaf.easing,
        delay: leaf.delay,
      },
    ],
  };
}

/**
 * What the frame driver did with one leaf of one build of an animation of
 * `frameRecordedOf`. The times are on the animation clock. A value has the unit
 * that the frame driver wrote.
 */
export type FrameRecord = {
  box: string;
  /** The key of the leaf, or the kind of its transform operation. */
  key: string;
  /** The place of the operation in the transform of the build. */
  operation?: number;
  /**
   * The call that started the animation of the leaf: its frame time, the value
   * that it gave, and the count of frames that the record before this one of
   * the leaf of the box had at the call.
   */
  start?: { timeMs: number; value: number | string; replacedFrames: number };
  /**
   * The start time and the start value that a timing took from the timing that
   * it replaced, which had its end value (`onStart` of `withTiming`).
   */
  adoptedStart?: { timeMs: number; value: number | string };
  /**
   * Each frame that the leaf got, with the value that it wrote and the time of
   * the animation clock when its frame function ran.
   */
  frames: { timeMs: number; value: number | string; ranMs: number }[];
  /**
   * The numbers of the values that the builder got: the laid-out values of the
   * view, on the pixel grid of the device.
   */
  layoutValues: Record<string, number>;
};

export type OperationFrameRecord = FrameRecord & { operation: number };

export const isOperationRecord = (
  record: FrameRecord
): record is OperationFrameRecord => record.operation !== undefined;

const frameRecords = makeMutable<FrameRecord[]>([]);

export function resetFrameRecords() {
  runOnUISync(() => {
    'worklet';
    frameRecords.value = [];
  });
}

/**
 * The records of each build since `resetFrameRecords`, in the order of the
 * builds.
 */
export function readFrameRecords() {
  return runOnUISync(() => {
    'worklet';
    return frameRecords.value;
  });
}

/**
 * The animation of a builder or of a function, with a `FrameRecord` of each
 * leaf of each build under the name `box`.
 */
export function frameRecordedOf(box: string, animation: AnimationSource) {
  return withPreparedLeaves(animation, (leaf, place, values) => {
    'worklet';
    const { onStart } = leaf;
    if (!onStart || !leaf.onFrame) {
      return;
    }
    const layoutValues: Record<string, number> = {};
    for (const [name, value] of Object.entries(values ?? {})) {
      if (typeof value === 'number') {
        layoutValues[name] = value;
      }
    }
    const record: FrameRecord = { box, ...place, frames: [], layoutValues };
    const replaced = [...frameRecords.value]
      .reverse()
      .find((each) => each.box === box && isSameLeaf(each, place));
    frameRecords.value.push(record);
    let recordedOnFrame: FrameAnimation['onFrame'] | undefined;
    leaf.onStart = (self, value, now, previous) => {
      const { startTime, startValue } = self;
      onStart(self, value, now, previous);
      // A leaf that starts again from its own start goes on with its record.
      if (
        record.start &&
        self.startTime === startTime &&
        self.startValue === startValue
      ) {
        return;
      }
      record.start = {
        timeMs: now,
        value,
        replacedFrames: replaced?.frames.length ?? 0,
      };
      if (self.startTime !== undefined && self.startTime !== now) {
        record.adoptedStart = {
          timeMs: self.startTime,
          value: self.startValue,
        };
      }
      // The start of an animation of a value with a unit sets its frame function.
      if (self.onFrame !== recordedOnFrame) {
        const onFrame = self.onFrame;
        recordedOnFrame = (animation, frameTimeMs) => {
          const finished = onFrame(animation, frameTimeMs);
          record.frames.push({
            timeMs: frameTimeMs,
            value: animation.current,
            ranMs: global._getAnimationTimestamp(),
          });
          return finished;
        };
        self.onFrame = recordedOnFrame;
      }
    };
  });
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
  frameLayout: frameRecordedOf(
    'frame',
    layoutOf(leaves(true), { name: 'frame' })
  ),
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

/**
 * The frame of a box from a `Position` sample and a `Size` sample. Each sample
 * keeps its own `monotonicTimeMs`.
 */
export async function sampleFrame(tag: number) {
  const [position, size] = await Promise.all([
    sample(tag, 'Position'),
    sample(tag, 'Size'),
  ]);
  return {
    model: frameOf(position.model, size.model),
    presentation: frameOf(position.presentation, size.presentation),
    playbacks: size.playbacks,
    monotonicTimeMs: size.monotonicTimeMs,
    position,
    size,
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

type SizeBoxAnimations = Pick<
  Parameters<typeof Animated.View>[0],
  'layout' | 'entering' | 'exiting'
>;

type SizeBoxStyle = React.ComponentProps<typeof Animated.View>['style'];

type SizeBoxHostProps = React.PropsWithChildren<
  SizeBoxAnimations & {
    ref: ReturnType<typeof useTestRef>;
    collapsable: boolean;
    source?: ImageSourcePropType;
    style: SizeBoxStyle;
  }
>;

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

export type SizeBoxProps = React.PropsWithChildren<
  SizeBoxAnimations & {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    host?: SizeBoxHost;
    style?: SizeBoxStyle;
    refName?: string;
  }
>;

export function SizeBox({
  left = 0,
  top = 0,
  width = BOX_SIZE,
  height = BOX_SIZE,
  host = 'View',
  style,
  layout,
  entering,
  exiting,
  refName = BOX_REF,
  children,
}: SizeBoxProps) {
  const ref = useTestRef(refName);
  const Host = SIZE_BOX_HOSTS[host];
  return (
    <Host
      ref={ref}
      layout={layout}
      entering={entering}
      exiting={exiting}
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

const TRACKING_FLAG = 'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS';

export async function withTracking(tracks: boolean, body: () => Promise<void>) {
  setDynamicFeatureFlag(TRACKING_FLAG, tracks);
  try {
    await body();
  } finally {
    setDynamicFeatureFlag(TRACKING_FLAG, false);
    await render(null);
  }
}

/** The opacity of each mounted `WriterBox`, by its `refName`. */
export const opacities: Record<string, SharedValue<number>> = {};

/** A `SizeBox` whose opacity an animated style gives. */
export function WriterBox({
  initialOpacity = 0.5,
  ...box
}: SizeBoxProps & { initialOpacity?: number }) {
  const opacity = useSharedValue(initialOpacity);
  opacities[box.refName ?? BOX_REF] = opacity;
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  // oxlint-disable-next-line reanimated/animated-style-non-animated-component -- The host of a `SizeBox` is an animated component.
  return <SizeBox {...box} style={[box.style, animatedStyle]} />;
}

export const LOOP_DURATION = 6 * DURATION;
export const LOOP_KEYFRAMES = { from: { opacity: 0.2 }, to: { opacity: 0.8 } };

/** A `SizeBox` whose opacity a CSS animation moves between the two keyframes. */
export function CSSLoopBox(box: SizeBoxProps) {
  return (
    <SizeBox
      {...box}
      style={[
        box.style,
        {
          opacity: LOOP_KEYFRAMES.from.opacity,
          animationName: LOOP_KEYFRAMES,
          animationDuration: LOOP_DURATION,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        },
      ]}
    />
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
    playbacks: native.playbacks,
    monotonicTimeMs: native.monotonicTimeMs,
    position: native.position,
    size: native.size,
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
    keysAtEnd: end.playbacks.length,
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
