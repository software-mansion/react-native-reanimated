import type { ComponentRef, RefObject } from 'react';
import React, { useEffect, useState } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type {
  EasingFunction,
  EasingFunctionFactory,
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
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
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { runOnUISync, scheduleOnRN } from 'react-native-worklets';

import {
  expect,
  getTestComponent,
  render,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { blockUIThread } from './nativeLayoutLoad';

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
  /** Of a `Received` event: the start of the timelines on the animation clock. */
  originTimestampMs?: number;
  leafValue?: number;
  layoutAnimationType?: string;
};

export type Band = { from: number; to: number };

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
   * end of each segment, and the time of each value as a part of its duration.
   */
  members: { property: string; values: number[][]; keyTimes: number[] }[];
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
// The presentation layer has a new animation only after the first display frame of its commit.
export const FIRST_FRAMES_MS = 3 * FRAME_MS;
// One display frame and 1.33 ms: a read can show the value before a command for this time after the start of a track.
export const UNSEEN_START_MS = 18;
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

export type CommandHandle = Pick<
  TraceEvent,
  'surfaceId' | 'tag' | 'owner' | 'generation'
>;

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

export const isOfCommand = (
  event: TraceEvent,
  { surfaceId, tag, owner, generation }: CommandHandle
) =>
  event.surfaceId === surfaceId &&
  event.tag === tag &&
  event.owner === owner &&
  event.generation === generation;

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

const NO_VIEW = 'no view';

export function sample(tag: number, target: string): Promise<TargetSample> {
  return new Promise((resolve, reject) => {
    devTools.sampleNativeAnimationTarget?.(tag, target, (targetSample) =>
      targetSample ? resolve(targetSample) : reject(new Error(NO_VIEW))
    );
  });
}

export const isNoView = (error: unknown) =>
  error instanceof Error && error.message === NO_VIEW;

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

/**
 * The largest change of a declared value from `framesBefore` display frames
 * before a time to one display frame after it.
 */
export const declaredFrameChangeAt = (
  valueAt: (timeMs: number) => number,
  timeMs: number,
  framesBefore = 1
) =>
  declaredFrameChangesAt(
    (stepTimeMs) => [valueAt(stepTimeMs)],
    timeMs,
    framesBefore
  )[0];

/** `declaredFrameChangeAt` of each of the declared values of one time. */
export function declaredFrameChangesAt(
  valuesAt: (timeMs: number) => number[],
  timeMs: number,
  framesBefore = 1
) {
  const values = valuesAt(timeMs);
  const largest = values.map(() => 0);
  for (let step = -8 * framesBefore; step <= 8; step++) {
    valuesAt(timeMs + (step * FRAME_MS) / 8).forEach((value, index) => {
      largest[index] = Math.max(
        largest[index],
        Math.abs(value - values[index])
      );
    });
  }
  return largest;
}

/**
 * One phase of a declared timeline: a move to `to`, or a hold when it has no
 * move.
 */
export type Phase = {
  durationMs: number;
  move?: { to: number; curve: EasingFunction };
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
  const starts = declaredStartsOf(timeline);
  const parts = timeline.phases.flatMap(
    ({ durationMs, move }, phase): TimedPart[] =>
      move ? [{ ...move, durationMs, startMs: starts[phase] }] : []
  );
  return (timeMs: number) => declaredValueAt(timeline.from, parts, timeMs);
}

type TimedTrack = {
  /** The declared value at a time from the origin. */
  declared: (timeMs: number) => number;
  /** The times from the origin at which a phase of the track starts. */
  edgesMs: number[];
  /** The start of the track on the sample clock. */
  origin: Band;
  /** From the start to the end of the track in the trace, on the sample clock. */
  played: Band;
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

export type NativeResidual = {
  /** How far each value is from the declared values of one time of the band. */
  distances: number[];
  /** How long before the read that time is. */
  ageMs: number;
  isOnTimeline: boolean;
  /**
   * The times that the read can show have the start of a track that replaced a
   * track.
   */
  crossesReplacement: boolean;
};

/**
 * The values of one read are the declared values of the keys at one time of the
 * display frame before the read.
 */
export function expectNativeTimeline(
  values: number[],
  readTimeMs: number,
  tracks: NativeTrack[]
) {
  const residual = nativeResidualOf(values, readTimeMs, tracks);
  const row = values
    .map((value, track) => {
      const { origin } = tracks[track];
      return `${value.toFixed(4)} at ${(readTimeMs - origin.to).toFixed(2)}..${(readTimeMs - origin.from).toFixed(2)} ms is ${residual.distances[track].toFixed(4)} from the declared values of the frame before`;
    })
    .join(', ');
  expect(residual.isOnTimeline ? '' : row).toBe('');
  return residual;
}

export function nativeResidualOf(
  values: number[],
  readTimeMs: number,
  tracks: NativeTrack[]
): NativeResidual {
  let nearest = {
    distances: values.map(() => Infinity),
    excess: Infinity,
    ageMs: 0,
  };
  for (const timeMs of possibleTimesOf(readTimeMs, tracks)) {
    const distances = values.map((value, track) =>
      Math.abs(value - declaredOf(tracks[track], timeMs))
    );
    const excess = Math.max(
      ...distances.map((distance, track) => distance / tracks[track].tolerance)
    );
    if (excess < nearest.excess) {
      nearest = { distances, excess, ageMs: readTimeMs - timeMs };
    }
  }
  const { distances, excess, ageMs } = nearest;
  const { from } = possibleBandOf(readTimeMs, tracks);
  return {
    distances,
    ageMs,
    isOnTimeline: excess <= 1,
    crossesReplacement: tracks.some(
      ({ replaced, played }) => replaced !== undefined && from < played.from
    ),
  };
}

/** The least and the largest value that a read at a time can show of a key. */
export function declaredBandOf(track: TimedTrack, readTimeMs: number): Band {
  const values = possibleTimesOf(readTimeMs, [track]).map((timeMs) =>
    declaredOf(track, timeMs)
  );
  return { from: Math.min(...values), to: Math.max(...values) };
}

/**
 * A value that the route took from a track at a time is a value that a read of
 * the track can show at that time.
 */
export const expectCapturedStart = ({ track, value, timeMs }: Capture) =>
  expectNativeTimeline([value], timeMs, [track]);

const BAND_STEPS = 64;
const BEFORE_MS = 1e-6;

const withReplacedOf = (track: TimedTrack): TimedTrack[] => [
  track,
  ...(track.replaced ? withReplacedOf(track.replaced) : []),
];

/**
 * The times of the sample clock that a read can show: the display frame before
 * the read, with the uncertainty of the origins on each side.
 */
function possibleBandOf(readTimeMs: number, tracks: TimedTrack[]): Band {
  const uncertaintyMs = Math.max(
    ...tracks
      .flatMap(withReplacedOf)
      .map(({ origin }) => (origin.to - origin.from) / 2)
  );
  return {
    from: readTimeMs - FRAME_MS - uncertaintyMs,
    to: readTimeMs + uncertaintyMs,
  };
}

/**
 * The times of `possibleBandOf`, the latest first: equal steps, the two sides
 * of each phase edge, and the two sides of the start of each track that
 * replaced a track.
 */
function possibleTimesOf(readTimeMs: number, tracks: TimedTrack[]) {
  const { from, to } = possibleBandOf(readTimeMs, tracks);
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
  /**
   * The view shows `from` before the command. A track of a key with another
   * start value that replaces no track has a gate: a read can show the value
   * before the command for `UNSEEN_START_MS` after the start of the track.
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
    generation: number;
    timeline: Timeline;
    finished?: boolean;
    replaced?: PlayedTrack;
    /**
     * The value that the route took from the replaced track for the build of
     * the command: the start value of the track.
     */
    captured?: Capture;
    /** No read before this time of the sample clock is checked. */
    checkedFromMs: number;
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
 * replaced track for the build of the command.
 */
export function playedTracksOf(
  events: TraceEvent[],
  command: CommandHandle,
  clockOffset: Band,
  keys: DeclaredKey[],
  replaced: PlayedTrack[] = []
): PlayedTrack[] {
  const origin = nativeOriginOf(events, command, clockOffset);
  return keys.map((declared) => {
    const ofTarget = events.filter(({ target }) => target === declared.target);
    const startedMs = requireEvent(
      ofTarget,
      command,
      'TrackStarted'
    ).monotonicTimeMs;
    const ended = ofTarget.find(
      (event) => event.event === 'TrackEnded' && isOfCommand(event, command)
    );
    const replacedTrack = replaced.find((track) => isSameLeaf(track, declared));
    const captured =
      declared.startsOnScreen && replacedTrack
        ? lastCaptureOf(events, replacedTrack, startedMs)
        : undefined;
    const timeline = declaredTimelineOf(
      declared.leaf,
      captured?.value ?? declared.from,
      declared.to,
      declared.base
    );
    return {
      ...declared,
      generation: command.generation,
      origin,
      timeline,
      declared: declaredValueOf(timeline),
      edgesMs: declaredStartsOf(timeline),
      played: { from: startedMs, to: ended?.monotonicTimeMs ?? Infinity },
      finished: ended?.finished,
      replaced: replacedTrack,
      captured,
      checkedFromMs:
        declared.startsOnScreen || replacedTrack
          ? -Infinity
          : startedMs + UNSEEN_START_MS,
    };
  });
}

/**
 * A value that the route took from a live track for the build of a commit, with
 * the track alone: the route computes the value from the timeline of that
 * track.
 */
export type Capture = { track: NativeTrack; value: number; timeMs: number };

function lastCaptureOf(
  events: TraceEvent[],
  track: PlayedTrack,
  untilMs: number
) {
  const captures = capturesOf(events, [track]).filter(
    ({ timeMs }) => timeMs <= untilMs
  );
  if (captures.length === 0) {
    throw new Error(
      `The trace has no captured value of ${describeLeaf(track)} of the command ${track.generation} before its replacement.`
    );
  }
  return captures[captures.length - 1];
}

/**
 * The captures of the tracks in the events. The capture of a `Transform` track
 * has no value.
 */
export const capturesOf = (events: TraceEvent[], tracks: PlayedTrack[]) =>
  events.flatMap(
    ({ event, target, generation, leafValue, monotonicTimeMs }): Capture[] => {
      const track = tracks
        .filter(isScalarTrack)
        .find(
          (each) => each.target === target && each.generation === generation
        );
      return event === 'LayoutLeafCaptured' && leafValue !== undefined && track
        ? [
            {
              track: { ...track, replaced: undefined },
              value: leafValue,
              timeMs: monotonicTimeMs,
            },
          ]
        : [];
    }
  );

export type MatrixTolerance = { cells: number; translation: number };

export type NativeRead = {
  target: string;
  tracks: PlayedTrack[];
  timeMs: number;
  values: number[];
  checked: NativeTrack[];
  residual: NativeResidual;
  /** False for a read before `checkedFromMs` of a track: it has no assertion. */
  isChecked: boolean;
};

/**
 * Each sample of one view is on the keys of the tracks that play at its time. A
 * sample of the `Transform` target is checked as the cells of its matrix.
 */
export function expectNativeReads(
  samples: Record<string, TargetSample>,
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance
): NativeRead[] {
  return Object.entries(samples).flatMap(([target, targetSample]) => {
    const { presentation, monotonicTimeMs: timeMs } = targetSample;
    const playing = playingTracksOf(tracks, target, timeMs);
    if (playing.length === 0) {
      return [];
    }
    const values = playing.some(isOperationTrack)
      ? presentation
      : playing.map(() => presentation[0]);
    const checked = shownTracksOf(playing, tracks, matrixTolerance);
    const isChecked =
      checkedTracksOf(tracks, target, timeMs).length === playing.length;
    return [
      {
        target,
        tracks: playing,
        timeMs,
        values,
        checked,
        residual: (isChecked ? expectNativeTimeline : nativeResidualOf)(
          values,
          timeMs,
          checked
        ),
        isChecked,
      },
    ];
  });
}

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
    ({ checkedFromMs }) => timeMs >= checkedFromMs
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

const cellsProductOf = (first: number[], second: number[]) =>
  first.map((_, cell) => {
    const row = Math.floor(cell / 4);
    const column = cell % 4;
    return [0, 1, 2, 3].reduce(
      (sum, index) => sum + first[4 * row + index] * second[4 * index + column],
      0
    );
  });

/**
 * The cells of a `Transform` sample for the values of the operations of a
 * style. The presentation layer of a native track that plays has the product of
 * the operations in the other order than a layer at rest.
 */
export function cellsOf(
  operations: OperationValue[],
  layer: 'playing' | 'rest'
) {
  return (layer === 'rest' ? [...operations].reverse() : operations)
    .map(operationCellsOf)
    .reduce(cellsProductOf, IDENTITY);
}

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
      return { kind, cells: to };
    }),
    'rest'
  );

/**
 * The cells of a `Transform` sample of the operation tracks of one command
 * while they play, in the order of the style, at a time from their origin.
 */
const declaredCellsOf = (operations: PlayedTrack[]) => (timeMs: number) =>
  cellsOf(
    operations.map(({ key, declared, timeline: { unit } }) => ({
      kind: key,
      amount: declared(timeMs),
      unit,
    })),
    'playing'
  );

/**
 * The tracks of the values of one sample of the target of `playing`, which are
 * the tracks of one target that play at one time: one track for each cell of a
 * `Transform` sample, or the track of the sample of each scalar key.
 */
export function shownTracksOf(
  playing: PlayedTrack[],
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance
): NativeTrack[] {
  const operations = playing.filter(isOperationTrack);
  return operations.length > 0
    ? transformTracksOf(operations, tracks, matrixTolerance)
    : playing.filter(isScalarTrack).map((track) => shownTrackOf(track, tracks));
}

/**
 * The track of a scalar key in the value of a sample of its target. The sample
 * of a position key has the size of the time of its origin: the declared value
 * of the size track of its command, or the size at rest.
 */
export function shownTrackOf(
  track: ScalarTrack,
  tracks: PlayedTrack[]
): NativeTrack {
  const { size, origin, replaced } = track;
  if (!size) {
    return track;
  }
  const sizeTrack = tracks.find(
    ({ key, generation }) => key === size.key && generation === track.generation
  );
  const originMs = middleOf(origin);
  return {
    ...track,
    declared: (timeMs) =>
      layerPositionOf(
        track.declared(timeMs),
        sizeTrack ? declaredOf(sizeTrack, originMs + timeMs) : size.rest
      ),
    edgesMs: [
      ...track.edgesMs,
      ...(sizeTrack?.edgesMs ?? []).map(
        (edgeMs) => middleOf(sizeTrack!.origin) + edgeMs - originMs
      ),
    ],
    replaced:
      replaced && isScalarTrack(replaced)
        ? shownTrackOf(replaced, tracks)
        : undefined,
  };
}

/**
 * The value of a sample of the target of a key for a view at rest at a value of
 * the key.
 */
export const shownAtRestOf = ({ size }: ScalarKey, value: number) =>
  size ? layerPositionOf(value, size.rest) : value;

/**
 * One track for each cell of a `Transform` sample of the operation tracks of
 * one command while they play. The cells of one read need one time of all the
 * operations: the tracks have the one origin of their command. The tracks that
 * they replaced are the operation tracks of the command of the replaced track.
 */
function transformTracksOf(
  operations: OperationTrack[],
  tracks: PlayedTrack[],
  matrixTolerance: MatrixTolerance
): NativeTrack[] {
  const declaredCellsAt = declaredCellsOf(operations);
  let last = { timeMs: NaN, cells: IDENTITY };
  const cellsAt = (timeMs: number) => {
    if (timeMs !== last.timeMs) {
      last = { timeMs, cells: declaredCellsAt(timeMs) };
    }
    return last.cells;
  };
  const [{ origin, played, replaced }] = operations;
  const edgesMs = operations.flatMap((operation) => operation.edgesMs);
  const replacedCells =
    replaced &&
    transformTracksOf(
      tracks
        .filter(isOperationTrack)
        .filter(({ generation }) => generation === replaced.generation),
      tracks,
      matrixTolerance
    );
  return IDENTITY.map((_, cell) => ({
    declared: (timeMs: number) => cellsAt(timeMs)[cell],
    edgesMs,
    origin,
    played,
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
 * Each frame of a record wrote the value that the frame driver gives to the
 * timeline at the time of the frame, in the unit of the timeline, after the
 * start of the record.
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
  const offTimeline = record.frames.flatMap(({ timeMs, value }, frame) =>
    distances[frame] <= tolerance
      ? []
      : [
          `${value} at ${(timeMs - starts[0]).toFixed(2)} ms is ${distances[frame].toFixed(4)} from ${values[frame].toFixed(4)}${timeline.unit}`,
        ]
  );
  expect(offTimeline.join(', ')).toBe('');
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
 * The value that the replay of a record has after its last frame at or before a
 * time.
 */
function replayedValueOf(check: FrameCheck) {
  const { frames } = check.record;
  const { values } = replayOf(check);
  return (timeMs: number) =>
    frames.reduce(
      (value, frame, index) => (frame.timeMs <= timeMs ? values[index] : value),
      check.timeline.from
    );
}

type FrameReplay = { values: number[]; starts: number[] };

/**
 * The value that the frame driver writes for a timeline in each frame after a
 * start at a time, and the start of each phase that started. Code facts of
 * `packages/react-native-reanimated/src/animation`: a timing moves its start to
 * a frame that is before it (`timing` of `withTiming`); a delay starts its
 * animation in the first frame at or after its end, and the animation gets that
 * frame (`delay` of `withDelay`); a sequence starts its next animation in the
 * frame in which the current one ends, and the next one gets its first frame
 * after that frame (`sequence` of `withSequence`); a delay before the first
 * move runs the animation that its animation replaced, and the move starts at
 * the value of the frame before it (`delay` of `withDelay`). `replacedValueAt`
 * is the value of the replaced animation after its frame of a time.
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

type PresentationRead = { monotonicTimeMs: number; presentation: number[] };

const ROW_INTERVAL_MS = 30;

export type TakenRow<TRow> = {
  row: TRow;
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
  const takeRead = async () => {
    const row = await take();
    rows.push({ row });
    return readOf(row);
  };
  try {
    while (performance.now() < untilMs) {
      let read = await takeRead();
      const pollUntilMs = read.monotonicTimeMs + 2 * FRAME_MS;
      while (read.monotonicTimeMs < pollUntilMs) {
        const before = read;
        read = await takeRead();
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
  prepare: (leaf: BuiltLeaf, place: LeafPlace) => void
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
        prepare(leaf as BuiltLeaf, place);
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

async function readClockOffset(tag: number): Promise<Band> {
  const before = runOnUISync(animationTime);
  const { monotonicTimeMs } = await sample(tag, 'Transform');
  const after = runOnUISync(animationTime);
  return { from: monotonicTimeMs - after, to: monotonicTimeMs - before };
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
  { playbackKeys }: TargetSample,
  generation: number
) => playbackKeys.filter((key) => key.split('.')[2] === `${generation}`).length;

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

export type Leaf = Pick<LeafPart, 'duration' | 'easing'> & {
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
    scheduleOnRN(recordBuilderCall);
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
      const timing = leaf.isSpring
        ? withSpring(to)
        : withTiming(
            to,
            config,
            (hasCallback ?? leaf.hasCallback)
              ? () => {
                  'worklet';
                }
              : undefined
          );
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
      { to, duration: leaf.duration ?? DURATION, easing: leaf.easing },
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
  /** Each frame that the leaf got, with the value that it wrote. */
  frames: { timeMs: number; value: number | string }[];
};

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
  return withPreparedLeaves(animation, (leaf, place) => {
    'worklet';
    const { onStart } = leaf;
    if (!onStart || !leaf.onFrame) {
      return;
    }
    const record: FrameRecord = { box, ...place, frames: [] };
    const replaced = [...frameRecords.value]
      .reverse()
      .find((each) => each.box === box && isSameLeaf(each, place));
    frameRecords.value.push(record);
    let recordedOnFrame: FrameAnimation['onFrame'] | undefined;
    leaf.onStart = (self, value, now, previous) => {
      onStart(self, value, now, previous);
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
          record.frames.push({ timeMs: frameTimeMs, value: animation.current });
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
