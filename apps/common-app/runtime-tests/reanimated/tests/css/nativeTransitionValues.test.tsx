/*
 * The drawn values of CSS transitions that the Android platform can play: each
 * sample of the view sampler (`viewSampler.ts`) against the CSS curve on the
 * carried timeline. The sampler reads the view, so each value test gives the
 * same data with each driver of the property; its samples go to the log
 * (`logDrawnValues`) for a comparison of two builds. Each route test reads the
 * trace of the native animation host, and asserts on it only when the build has
 * a host (`nativeAnimationHostExists`).
 *
 * A curve check takes the start time of the curve from the uptime before and
 * after the render that starts the transition, plus the declared delay. A
 * sample is on the curve when the curve has its value within one display frame
 * of the sample time. The sampler records only window draws, and a view draws
 * only when a value changes, so a check needs only the values that a change
 * gives: the values in motion that the curve holds at a display frame, and the
 * end value. The value before each change but the first stays until that
 * change, so it binds the time of that change: on a moving curve, a gap of three
 * or more frames between two draws can be a fault. The first change must come
 * by the first change of the curve for the latest start time, or by the end of
 * the render if that is later, plus `START_APPLY_MS`. The log line has the
 * uptime before the render, so a comparison of two builds can read the time to
 * the first changed draw.
 *
 * Each time of the suite is on the Reanimated clock, so a run with slow
 * animations waits the drag factor times longer (`clockScale`).
 */
import type { ComponentRef } from 'react';
import React from 'react';
import type { ViewStyle } from 'react-native';
import {
  findNodeHandle,
  Modal,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { CSSTransitionProperty } from 'react-native-reanimated';
import Animated, {
  createAnimatedComponent,
  cubicBezier,
  linear,
  steps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { TraceEvent } from '../nativeAnimationObservation';
import {
  CSS_HOST_TIMING_KINDS,
  hasNativeCSSTransitions,
  nativeAnimationHostExists,
  playbackIdsOf,
  sample,
  takeTrace,
} from '../nativeAnimationObservation';
import { setSlowAnimations, SLOW_ANIMATIONS_DRAG } from '../slowAnimations';
import type {
  DrawnSample,
  FrameCallbackRun,
  SampledProperty,
  StartValue,
} from '../viewSampler';
import {
  animatorDurationScale,
  apiLevel,
  isViewSamplerAvailable,
  logDrawnValues,
  recordDrawnValues,
  recordDrawnValuesAndFrameCallbacks,
  uptimeMs,
} from '../viewSampler';

const BOX_REF = 'CSSNativeTransitionValuesBox';
const DURATION = 400;
const FRAME_MS = 17;
const SETTLE_MS = 200;
const SHADOW_COLOR_API_LEVEL = 28;
const CLOCK_WINDOW_MS = 300;
/** The values in motion that a curve check needs, if the curve gives them. */
const MIN_MOTION_VALUES = 3;
/** The frames that the suite allows from a cancelling render to the view. */
const CANCEL_APPLY_FRAMES = 3;
/** The frames that the suite allows from a starting render to the view. */
const START_APPLY_FRAMES = 3;
/** The time that the suite allows from a starting render to the first draw. */
const START_APPLY_MS = (START_APPLY_FRAMES + 1) * FRAME_MS;

type Easing =
  | 'linear'
  | ReturnType<typeof cubicBezier>
  | ReturnType<typeof steps>
  | ReturnType<typeof linear>;

/** A style value and the value that the sampler reads for it. */
type Endpoint = { style: number | string; drawn: number };

type PropertyCase = {
  property: SampledProperty;
  target: string;
  from: Endpoint;
  to: Endpoint;
  tolerance: number;
};

const RED = { style: 'rgb(255, 0, 0)', drawn: 0xffff0000 };
const BLUE = { style: 'rgb(0, 0, 255)', drawn: 0xff0000ff };
const GREEN = { style: 'rgb(0, 255, 0)', drawn: 0xff00ff00 };
const COLOR_TOLERANCE = 1;

const OPACITY: PropertyCase = {
  property: 'opacity',
  target: 'Opacity',
  from: { style: 1, drawn: 1 },
  to: { style: 0.2, drawn: 0.2 },
  tolerance: 0.01,
};

const BACKGROUND_COLOR: PropertyCase = {
  property: 'backgroundColor',
  target: 'BackgroundColor',
  from: RED,
  to: BLUE,
  tolerance: COLOR_TOLERANCE,
};

const PROPERTY_CASES: PropertyCase[] = [
  OPACITY,
  BACKGROUND_COLOR,
  {
    property: 'borderColor',
    target: 'BorderColor',
    from: RED,
    to: BLUE,
    tolerance: COLOR_TOLERANCE,
  },
  {
    property: 'borderRadius',
    target: 'BorderRadius',
    from: { style: 0, drawn: 0 },
    to: { style: 30, drawn: 30 },
    tolerance: 0.5,
  },
  {
    property: 'shadowColor',
    target: 'ShadowColor',
    from: RED,
    to: BLUE,
    tolerance: COLOR_TOLERANCE,
  },
];

const EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);

const TIMING_CASES: { name: string; kind: string; easing: Easing }[] = [
  { name: 'linear', kind: 'linear', easing: 'linear' },
  {
    name: 'cubic-bezier(0.42, 0, 0.58, 1)',
    kind: 'cubicBezier',
    easing: EASE_IN_OUT,
  },
  { name: 'steps(4)', kind: 'steps', easing: steps(4) },
  { name: 'linear(0, 0.8, 1)', kind: 'linear()', easing: linear(0, 0.8, 1) },
];

const isColor = (property: SampledProperty) =>
  property === 'backgroundColor' ||
  property === 'borderColor' ||
  property === 'shadowColor';

const startValueOf = (
  { property, from, tolerance }: PropertyCase,
  value = from.drawn
): StartValue => ({ property, value, tolerance, isColor: isColor(property) });

type Transition = {
  propertyCase: PropertyCase;
  easing?: Easing;
  duration?: number;
  delay?: number;
};

/** The uptime before and after the render that starts the transition. */
type RenderInterval = { earliestMs: number; latestMs: number };

type Played = {
  tag: number;
  samples: DrawnSample[];
  frameCallbacks: FrameCallbackRun[];
  events: TraceEvent[];
  started: RenderInterval;
};

function ValueBox({
  propertyCase: { property },
  value,
  easing = 'linear',
  duration = DURATION,
  delay = 0,
  transitionProperty = property,
  extraStyle,
  onCSSTransitionStart,
}: Omit<Transition, 'propertyCase'> & {
  propertyCase: PropertyCase;
  value: Endpoint['style'];
  transitionProperty?: CSSTransitionProperty;
  extraStyle?: ViewStyle;
  onCSSTransitionStart?: () => void;
}) {
  const ref = useTestRef(BOX_REF);
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        onCSSTransitionStart={onCSSTransitionStart}
        style={[
          styles.box,
          { [property]: value } as ViewStyle,
          extraStyle,
          {
            transitionProperty,
            transitionDuration: duration,
            transitionTimingFunction: easing,
            transitionDelay: delay,
          },
        ]}
      />
    </View>
  );
}

let dragOfRun = 1;

/**
 * The real time of one millisecond of the Reanimated clock: the drag that the
 * suite set, 1 with no slow animations.
 */
function clockScale() {
  return dragOfRun;
}

/**
 * The clock scales that a window of `CLOCK_WINDOW_MS` allows. Two uptime reads
 * bound the time of each clock read, and each clock reads whole milliseconds.
 */
async function measureClockScaleRange() {
  const readClock = () =>
    runOnUISync(() => {
      'worklet';
      return global._getAnimationTimestamp();
    });
  const beforeStartMs = await uptimeMs();
  const startClock = readClock();
  const afterStartMs = await uptimeMs();
  await wait(CLOCK_WINDOW_MS);
  const beforeEndMs = await uptimeMs();
  const endClock = readClock();
  const afterEndMs = await uptimeMs();
  const clock = endClock - startClock;
  return {
    minScale: (beforeEndMs - afterStartMs - 1) / (clock + 1),
    maxScale: (afterEndMs - beforeStartMs + 1) / (clock - 1),
  };
}

/** The host plays CSS transitions only while the system animators run. */
async function animatorsEnabled() {
  return (await animatorDurationScale()) > 0;
}

/** Waits `clockMs` of the Reanimated clock. */
async function waitClock(clockMs: number) {
  await wait(Math.max(0, clockMs * clockScale()));
}

/** Renders `element` and gives the uptime before and after the render. */
async function renderTimed(
  element: Parameters<typeof render>[0]
): Promise<RenderInterval> {
  const earliestMs = await uptimeMs();
  await render(element);
  return { earliestMs, latestMs: await uptimeMs() };
}

/**
 * Renders the start value, then records the draws from the render of the end
 * value.
 */
async function play(
  transition: Transition,
  during: () => Promise<void> = () =>
    waitClock(
      (transition.duration ?? DURATION) + (transition.delay ?? 0) + SETTLE_MS
    )
): Promise<Played> {
  const { propertyCase } = transition;
  await render(<ValueBox {...transition} value={propertyCase.from.style} />);
  await wait(50);
  await takeTrace();
  const tag = getTestComponent(BOX_REF).getTag();
  let started: RenderInterval = { earliestMs: 0, latestMs: 0 };
  const { samples, frameCallbacks } = await recordDrawnValuesAndFrameCallbacks(
    tag,
    [propertyCase.property],
    async () => {
      started = await renderTimed(
        <ValueBox {...transition} value={propertyCase.to.style} />
      );
      await during();
    }
  );
  const events = (await takeTrace()).filter((event) => event.tag === tag);
  return { tag, samples, frameCallbacks, events, started };
}

/** The eased progress of a CSS easing, in the form of the native timing objects. */
function curveOf(easing: Easing): (progress: number) => number {
  if (easing === 'linear') {
    return (progress) => progress;
  }
  const normalized = easing.normalize();
  if (normalized === 'linear') {
    return (progress) => progress;
  }
  if ('x1' in normalized) {
    const { x1, y1, x2, y2 } = normalized;
    return (progress) => cubicBezierAt(x1, y1, x2, y2, progress);
  }
  const pointsX = normalized.points.map(({ x }) => x);
  const pointsY = normalized.points.map(({ y }) => y);
  if ('stepsNumber' in easing) {
    return (progress) => pointsY[lastAtOrBefore(progress, pointsX)];
  }
  return (progress) => {
    const left = lastAtOrBefore(progress, pointsX);
    if (left === pointsX.length - 1) {
      return pointsY[left];
    }
    const slope =
      (pointsY[left + 1] - pointsY[left]) / (pointsX[left + 1] - pointsX[left]);
    return pointsY[left] + slope * (progress - pointsX[left]);
  };
}

function cubicBezierAt(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  progress: number
) {
  const at = (first: number, second: number, t: number) =>
    3 * first * t * (1 - t) ** 2 + 3 * second * t ** 2 * (1 - t) + t ** 3;
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 40; iteration++) {
    const middle = (low + high) / 2;
    if (at(x1, x2, middle) < progress) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return at(y1, y2, (low + high) / 2);
}

function lastAtOrBefore(progress: number, pointsX: number[]) {
  let index = 0;
  while (index + 1 < pointsX.length && pointsX[index + 1] <= progress) {
    index++;
  }
  return index;
}

/**
 * The value between two drawn values: per channel for a color, as the native
 * writers do.
 */
function valueBetween(
  property: SampledProperty,
  from: number,
  to: number,
  progress: number
) {
  if (!isColor(property)) {
    return from + progress * (to - from);
  }
  return [24, 16, 8, 0].reduce((color, shift) => {
    const fromChannel = Math.floor(from / 2 ** shift) % 256;
    const toChannel = Math.floor(to / 2 ** shift) % 256;
    const channel = Math.round(
      fromChannel + (toChannel - fromChannel) * progress
    );
    return color + Math.min(255, Math.max(0, channel)) * 2 ** shift;
  }, 0);
}

function distance(property: SampledProperty, lhs: number, rhs: number) {
  if (!isColor(property)) {
    return Math.abs(lhs - rhs);
  }
  return Math.max(
    ...[24, 16, 8, 0].map((shift) =>
      Math.abs(
        (Math.floor(lhs / 2 ** shift) % 256) -
          (Math.floor(rhs / 2 ** shift) % 256)
      )
    )
  );
}

type Curve = {
  property: SampledProperty;
  from: number;
  to: number;
  ease: (progress: number) => number;
  /** On the uptime clock. */
  durationMs: number;
  tolerance: number;
};

function progressAt(curve: Curve, originMs: number, timeMs: number) {
  return curve.durationMs > 0
    ? Math.min(1, Math.max(0, (timeMs - originMs) / curve.durationMs))
    : Number(timeMs >= originMs);
}

function curveValueAt(curve: Curve, originMs: number, timeMs: number) {
  return valueBetween(
    curve.property,
    curve.from,
    curve.to,
    curve.ease(progressAt(curve, originMs, timeMs))
  );
}

/**
 * True when the curve has the value of the sample within one display frame of
 * the sample time.
 */
function isOnCurve(
  curve: Curve,
  originMs: number,
  timeMs: number,
  value: number
) {
  for (let offset = -FRAME_MS; offset <= FRAME_MS; offset++) {
    const expected = curveValueAt(curve, originMs, timeMs + offset);
    if (distance(curve.property, value, expected) <= curve.tolerance) {
      return true;
    }
  }
  return false;
}

/** One sampled value of a curve check: the value at `valueIndex` of each sample. */
type CurveSamples = { samples: DrawnSample[]; valueIndex: number };

/**
 * The faults of the samples against the curve, as text: the samples and the
 * held values (`heldValuesOf`) off the curve for the best start time in
 * `origins`, fewer values in motion than the curve gives (`motionValuesOf`), a
 * first change after `firstChangeDueMs`, and, when the samples must reach the
 * end, no sample at the end value.
 */
function curveFaults(
  curve: Curve,
  origins: Awaited<ReturnType<typeof originsOf>>,
  series: CurveSamples[],
  reachesEnd = true
) {
  const valuesOf = ({ samples, valueIndex }: CurveSamples) =>
    samples
      .filter(({ timeMs }) => timeMs >= origins.judgedFromMs)
      .map(
        ({ timeMs, values }): CurvePoint => ({
          timeMs,
          value: values[valueIndex],
        })
      );
  const points = series.flatMap((curveSamples) => {
    const values = valuesOf(curveSamples);
    return [...values, ...heldValuesOf(curve, values)];
  });
  let best: { originMs: number; misses: typeof points } | undefined;
  for (
    let originMs = origins.earliestMs;
    originMs <= origins.latestMs;
    originMs++
  ) {
    const misses = points.filter(
      ({ timeMs, value }) => !isOnCurve(curve, originMs, timeMs, value)
    );
    if (!best || misses.length < best.misses.length) {
      best = { originMs, misses };
    }
  }
  const { originMs, misses } = best!;
  const faults = misses.map(
    ({ timeMs, value, isHeld }) =>
      `${(timeMs - originMs).toFixed(0)} ms: ${value}${isHeld ? ' held' : ''}`
  );
  const neededInMotion = motionValuesOf(curve);
  const dueMs = firstChangeDueMs(curve, origins);
  for (const values of series.map(valuesOf)) {
    const firstChange = values.find(
      ({ value }) =>
        distance(curve.property, value, curve.from) > curve.tolerance
    );
    if (firstChange && firstChange.timeMs > dueMs) {
      faults.push(
        `first change ${(firstChange.timeMs - dueMs).toFixed(0)} ms after its due time`
      );
    }
    const inMotion = valuesInMotion(
      curve,
      values.map(({ value }) => value)
    ).length;
    if (inMotion < neededInMotion) {
      faults.push(`${inMotion} of ${neededInMotion} values in motion`);
    }
    const isAtEnd = values.some(
      ({ value }) =>
        distance(curve.property, value, curve.to) <= curve.tolerance
    );
    if (reachesEnd && !isAtEnd) {
      faults.push(`no sample at the end value ${curve.to}`);
    }
  }
  return faults.join(', ');
}

type CurvePoint = { timeMs: number; value: number; isHeld?: boolean };

/**
 * The latest time of the first changed draw: the first change of the curve for
 * the latest start time, or the end of the render if that is later, plus
 * `START_APPLY_MS`.
 */
function firstChangeDueMs(
  curve: Curve,
  { latestMs, renderEndMs }: Awaited<ReturnType<typeof originsOf>>
) {
  let changeMs = 0;
  while (
    changeMs < curve.durationMs &&
    distance(curve.property, curveValueAt(curve, 0, changeMs), curve.from) <=
      curve.tolerance
  ) {
    changeMs++;
  }
  return Math.max(renderEndMs, latestMs + changeMs) + START_APPLY_MS;
}

/**
 * A view draws at each change of its value, so the value before a change stays
 * until the frame before the change: one point for each change but the first,
 * whose time the start of the run sets. One dropped frame is allowed.
 */
function heldValuesOf(curve: Curve, values: CurvePoint[]): CurvePoint[] {
  const held: CurvePoint[] = [];
  let previous: CurvePoint = { timeMs: -Infinity, value: curve.from };
  let changes = 0;
  for (const point of values) {
    if (point.value !== previous.value && ++changes > 1) {
      held.push({
        timeMs: Math.max(previous.timeMs, point.timeMs - 2 * FRAME_MS),
        value: previous.value,
        isHeld: true,
      });
    }
    previous = point;
  }
  return held;
}

/**
 * The values between the endpoints that the draws must show, up to
 * `MIN_MOTION_VALUES`: the fewest distinct values that the curve has at the
 * display frames of one run, over each phase of the frames. A value that the
 * curve holds for less than one frame need not have a draw.
 */
function motionValuesOf(curve: Curve) {
  let fewest = MIN_MOTION_VALUES;
  for (let phaseMs = 0; phaseMs < FRAME_MS; phaseMs++) {
    const atFrames: number[] = [];
    for (let timeMs = phaseMs; timeMs <= curve.durationMs; timeMs += FRAME_MS) {
      atFrames.push(curveValueAt(curve, 0, timeMs));
    }
    fewest = Math.min(fewest, valuesInMotion(curve, atFrames).length);
  }
  return fewest;
}

/**
 * The distinct values between the endpoints: two values within the tolerance
 * are one value.
 */
function valuesInMotion(curve: Curve, values: number[]) {
  const isNear = (lhs: number, rhs: number) =>
    distance(curve.property, lhs, rhs) <= curve.tolerance;
  const distinct: number[] = [];
  for (const value of values) {
    if (
      !isNear(value, curve.from) &&
      !isNear(value, curve.to) &&
      !distinct.some((other) => isNear(value, other))
    ) {
      distinct.push(value);
    }
  }
  return distinct;
}

/**
 * The start times of a transition that the render interval allows, on the
 * uptime clock, the time of the first sample that the check judges (a sample
 * drawn before the render shows the old value whatever the delay), and the end
 * of the render.
 */
function originsOf(started: RenderInterval, delayMs: number) {
  const delay = delayMs * clockScale();
  return {
    earliestMs: started.earliestMs + delay,
    latestMs: started.latestMs + delay,
    judgedFromMs: started.earliestMs,
    renderEndMs: started.latestMs,
  };
}

function curveOfTransition(
  { propertyCase, easing = 'linear', duration = DURATION }: Transition,
  from = propertyCase.from.drawn
): Curve {
  return {
    property: propertyCase.property,
    from,
    to: propertyCase.to.drawn,
    ease: curveOf(easing),
    durationMs: duration * clockScale(),
    tolerance: propertyCase.tolerance,
  };
}

function expectOnCurve(
  caseName: string,
  {
    samples,
    started,
    frameCallbacks,
  }: Pick<Played, 'samples' | 'started' | 'frameCallbacks'>,
  transition: Transition,
  valueIndex = 0
) {
  logDrawnValues(caseName, samples, {
    renderStartMs: started.earliestMs,
    startValues: [startValueOf(transition.propertyCase)],
    delayMs: transition.delay,
    frameCallbacks,
  });
  expect(
    curveFaults(
      curveOfTransition(transition),
      originsOf(started, transition.delay ?? 0),
      [{ samples, valueIndex }]
    )
  ).toBe('');
}

/**
 * The first `TrackStarted` event that `isStart` takes; else it throws with the
 * trace.
 */
function trackStartOf(
  events: TraceEvent[],
  name: string,
  isStart: (event: TraceEvent) => boolean
) {
  const start = events.find(
    (event) => event.event === 'TrackStarted' && isStart(event)
  );
  if (!start) {
    throw new Error(`No start of ${name} in the trace: ${summarize(events)}`);
  }
  return start;
}

function summarize(events: TraceEvent[]) {
  return events
    .map(({ event, target, outcome, reason }) =>
      [event, target, outcome, reason]
        .filter((part) => part !== undefined)
        .join(':')
    )
    .join(' > ');
}

/**
 * The steps of more than `maxStep` from one draw to the next after `timeMs`, as
 * text.
 */
function jumpsAfter(
  samples: DrawnSample[],
  property: SampledProperty,
  timeMs: number,
  maxStep: number,
  valueIndex = 0
) {
  const jumps: string[] = [];
  for (let index = 1; index < samples.length; index++) {
    const before = samples[index - 1].values[valueIndex];
    const after = samples[index].values[valueIndex];
    if (
      samples[index].timeMs >= timeMs &&
      distance(property, before, after) > maxStep
    ) {
      jumps.push(`${before} to ${after}`);
    }
  }
  return jumps.join(', ');
}

/**
 * The largest step of the curves of the suite over one display frame, plus the
 * tolerance: twice the step of a linear curve.
 */
function maxStepOf({ from, to, tolerance, property }: PropertyCase) {
  return (
    (distance(property, from.drawn, to.drawn) * 2 * FRAME_MS) /
      (DURATION * clockScale()) +
    tolerance
  );
}

const lastValueOf = (samples: DrawnSample[], valueIndex = 0) =>
  samples[samples.length - 1].values[valueIndex];

/** The first sample that `isMatch` takes; else it throws with the samples. */
function firstSampleOf(
  samples: DrawnSample[],
  name: string,
  isMatch: (sample: DrawnSample) => boolean
) {
  const match = samples.find(isMatch);
  if (!match) {
    const drawn = samples
      .map(({ timeMs, values }) => `${timeMs}: ${values.join(' ')}`)
      .join(', ');
    throw new Error(`No sample of ${name}: ${drawn}`);
  }
  return match;
}

const valuesAfter = (samples: DrawnSample[], timeMs: number, valueIndex = 0) =>
  new Set(
    samples
      .filter((drawn) => drawn.timeMs >= timeMs)
      .map(({ values }) => values[valueIndex])
  );

/**
 * The value of a cancelled run stays as drawn: from the cancelling render, no
 * draw steps more than `maxStepOf` from the draw before it, so no frame shows a
 * snap, and from `CANCEL_APPLY_FRAMES` frames after that render each draw has
 * the last value drawn before that time. A view that keeps its value need not
 * draw again. Returns the faults as text.
 */
function cancellationFaults(
  samples: DrawnSample[],
  propertyCase: PropertyCase,
  cancelled: RenderInterval,
  valueIndex = 0
) {
  const jumps = jumpsAfter(
    samples,
    propertyCase.property,
    cancelled.earliestMs,
    maxStepOf(propertyCase),
    valueIndex
  );
  const settledFromMs = cancelled.latestMs + CANCEL_APPLY_FRAMES * FRAME_MS;
  const kept = samples.filter(({ timeMs }) => timeMs < settledFromMs);
  const settled = new Set(
    kept.length > 0 ? [lastValueOf(kept, valueIndex)] : []
  );
  for (const value of valuesAfter(samples, settledFromMs, valueIndex)) {
    settled.add(value);
  }
  const faults: string[] = [];
  if (jumps) {
    faults.push(`steps ${jumps}`);
  }
  if (settled.size > 1) {
    faults.push(`values after the cancellation: ${[...settled].join(', ')}`);
  }
  return faults.join(', ');
}

function TwoPropertyBox({
  opacity,
  color,
  transitionProperty,
}: {
  opacity: number;
  color: string;
  transitionProperty: CSSTransitionProperty;
}) {
  const ref = useTestRef(BOX_REF);
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        style={[
          styles.box,
          {
            opacity,
            backgroundColor: color,
            transitionProperty,
            transitionDuration: [DURATION, 2 * DURATION],
            transitionTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

const BOTH_PROPERTIES: CSSTransitionProperty = ['opacity', 'backgroundColor'];

/**
 * Starts both properties, then removes opacity from the transition properties
 * in its motion. `afterRemoval` runs while the background still plays.
 */
async function playTwoProperties(
  afterRemoval: (tag: number) => Promise<void> = async () => {}
) {
  await render(
    <TwoPropertyBox
      opacity={1}
      color={RED.style}
      transitionProperty={BOTH_PROPERTIES}
    />
  );
  await wait(50);
  await takeTrace();
  const tag = getTestComponent(BOX_REF).getTag();
  let started: RenderInterval = { earliestMs: 0, latestMs: 0 };
  let removed: RenderInterval = { earliestMs: 0, latestMs: 0 };
  const { samples, frameCallbacks } = await recordDrawnValuesAndFrameCallbacks(
    tag,
    ['backgroundColor', 'opacity'],
    async () => {
      started = await renderTimed(
        <TwoPropertyBox
          opacity={0.2}
          color={BLUE.style}
          transitionProperty={BOTH_PROPERTIES}
        />
      );
      await waitClock(DURATION / 2);
      removed = await renderTimed(
        <TwoPropertyBox
          opacity={0.2}
          color={BLUE.style}
          transitionProperty={['backgroundColor']}
        />
      );
      await waitClock(DURATION / 4);
      await afterRemoval(tag);
      await waitClock((5 * DURATION) / 4 + SETTLE_MS);
    }
  );
  const events = (await takeTrace()).filter((event) => event.tag === tag);
  return { tag, samples, frameCallbacks, started, removed, events };
}

const AnimatedTextInput = createAnimatedComponent(TextInput);
const inputRef = React.createRef<ComponentRef<typeof TextInput>>();
const FOCUSED_OPACITY = 0.4;
const SEED_OPACITY = 0.9;

function FocusableInput({
  defaultOpacity,
  width = 80,
  shift,
}: {
  defaultOpacity: number;
  width?: number;
  shift?: { value: number };
}) {
  const shiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift?.value ?? 0 }],
  }));
  return (
    <View style={styles.container}>
      <AnimatedTextInput
        ref={inputRef}
        style={[
          styles.box,
          shiftStyle,
          {
            width,
            opacity: { default: defaultOpacity, ':focus': FOCUSED_OPACITY },
            transitionProperty: 'opacity',
            transitionDuration: DURATION,
            transitionTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

let moveHeldInput: () => void = () => {};

function HeldInputScene({
  defaultOpacity,
  width,
}: {
  defaultOpacity: number;
  width?: number;
}) {
  const shift = useSharedValue(0);
  moveHeldInput = () => {
    shift.value = withTiming(20, { duration: DURATION / 2 });
  };
  return (
    <FocusableInput
      defaultOpacity={defaultOpacity}
      width={width}
      shift={shift}
    />
  );
}

/**
 * A pseudo-selector change plays on the platform only for a property that
 * already plays there (`CSSPlatformTransitionProxy::processDynamicDiffs`), so a
 * transition of the default opacity seeds the route first. Then the focus holds
 * the focused opacity, an unrelated commit and an animated style write the
 * view, and the blur releases the hold. `whileHeld` runs in the hold, after the
 * unrelated commit and the animated style.
 */
async function playHeldValue(
  whileHeld: (tag: number) => Promise<void> = async () => {}
) {
  await render(<HeldInputScene defaultOpacity={1} />);
  await wait(50);
  await render(<HeldInputScene defaultOpacity={SEED_OPACITY} />);
  await waitClock(DURATION + SETTLE_MS);
  await takeTrace();
  const tag = findNodeHandle(inputRef.current) ?? -1;
  let heldFromMs = 0;
  let releasedAtMs = 0;
  const samples = await recordDrawnValues(tag, ['opacity'], async () => {
    inputRef.current?.focus();
    await waitClock(DURATION + SETTLE_MS);
    heldFromMs = await uptimeMs();
    await render(<HeldInputScene defaultOpacity={SEED_OPACITY} width={90} />);
    moveHeldInput();
    await waitClock(DURATION);
    await whileHeld(tag);
    releasedAtMs = await uptimeMs();
    inputRef.current?.blur();
    await waitClock(DURATION + SETTLE_MS);
  });
  const events = (await takeTrace()).filter((event) => event.tag === tag);
  return { samples, heldFromMs, releasedAtMs, events };
}

/**
 * A start, a replacement, and a cancellation, each in its own commit with no
 * wait between them.
 */
async function playRapidReplacements() {
  let cancelled: RenderInterval = { earliestMs: 0, latestMs: 0 };
  const played = await play({ propertyCase: OPACITY }, async () => {
    await render(<ValueBox propertyCase={OPACITY} value={0.6} />);
    cancelled = await renderTimed(
      <ValueBox propertyCase={OPACITY} value={0.6} transitionProperty="none" />
    );
    await waitClock(DURATION + SETTLE_MS);
  });
  return { ...played, cancelled };
}

const CROWD_SIZE = 100;
const CROWD_FIRST_REF = 'CSSNativeTransitionValuesCrowdFirst';
const CROWD_LAST_REF = 'CSSNativeTransitionValuesCrowdLast';

function Crowd({ opacity }: { opacity: number }) {
  const firstRef = useTestRef(CROWD_FIRST_REF);
  const lastRef = useTestRef(CROWD_LAST_REF);
  const refOf = (index: number) =>
    index === 0 ? firstRef : index === CROWD_SIZE - 1 ? lastRef : undefined;
  return (
    <View style={styles.crowd}>
      {Array.from({ length: CROWD_SIZE }, (_, index) => (
        <Animated.View
          key={index}
          ref={refOf(index)}
          style={[
            styles.crowdBox,
            {
              opacity,
              transitionProperty: 'opacity',
              transitionDuration: DURATION,
              transitionTimingFunction: EASE_IN_OUT,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * 100 views start one shared cubic curve in one commit; the first and the last
 * view are sampled.
 */
async function playCrowd() {
  await render(<Crowd opacity={1} />);
  await wait(100);
  await takeTrace();
  const tags = [
    getTestComponent(CROWD_FIRST_REF).getTag(),
    getTestComponent(CROWD_LAST_REF).getTag(),
  ];
  let started: RenderInterval = { earliestMs: 0, latestMs: 0 };
  const { samples, frameCallbacks } = await recordDrawnValuesAndFrameCallbacks(
    tags,
    ['opacity'],
    async () => {
      started = await renderTimed(<Crowd opacity={0.2} />);
      await waitClock(DURATION + SETTLE_MS);
    }
  );
  const events = await takeTrace();
  return { samples, frameCallbacks, started, events };
}

/**
 * With `slowAnimations`, the cases run with the slow-animation drag of
 * Reanimated: the first case sets it and the last case clears it.
 */
export function describeTransitionValues({
  slowAnimations,
}: {
  slowAnimations: boolean;
}) {
  const nameSuffix = slowAnimations ? ' with slow animations' : '';

  describe(`CSS transition values that the Android platform can play${nameSuffix}`, () => {
    if (!isViewSamplerAvailable()) {
      return;
    }
    if (slowAnimations) {
      test('the Reanimated clock runs at the slow-animation drag', async () => {
        await setDrag(true);
        const { minScale, maxScale } = await measureClockScaleRange();
        expect(SLOW_ANIMATIONS_DRAG).toBeWithinRange(minScale, maxScale);
      });
    }
    registerValueCases();
  });

  describe(`CSS transition routes on the host for the value cases${nameSuffix}`, () => {
    if (!isViewSamplerAvailable()) {
      return;
    }
    if (hasNativeCSSTransitions) {
      registerRouteCases();
    }
    if (slowAnimations) {
      test('the slow-animation drag clears', () => setDrag(false));
    }
  });
}

async function setDrag(enabled: boolean) {
  await setSlowAnimations(enabled);
  dragOfRun = enabled ? SLOW_ANIMATIONS_DRAG : 1;
}

function registerValueCases() {
  for (const propertyCase of PROPERTY_CASES) {
    for (const timing of TIMING_CASES) {
      const caseName = `${propertyCase.property} with ${timing.name}`;

      test(`${caseName} draws the CSS curve`, async () => {
        if (
          propertyCase.property === 'shadowColor' &&
          (await apiLevel()) < SHADOW_COLOR_API_LEVEL
        ) {
          return;
        }
        const transition = { propertyCase, easing: timing.easing };
        expectOnCurve(caseName, await play(transition), transition);
      });

      test(`${caseName} takes the route of the platform route table`, async () => {
        if (!hasNativeCSSTransitions || !(await nativeAnimationHostExists())) {
          return;
        }
        const isRouted =
          CSS_HOST_TIMING_KINDS.includes(timing.kind) &&
          (propertyCase.property !== 'shadowColor' ||
            (await apiLevel()) >= SHADOW_COLOR_API_LEVEL) &&
          (await animatorsEnabled());
        const { events } = await play({ propertyCase, easing: timing.easing });
        expect(summarize(events)).toBe(
          isRouted
            ? `Received > TrackStarted:${propertyCase.target} > Admitted > TrackEnded:${propertyCase.target} > Ended:Finished:None`
            : ''
        );
      });
    }
  }

  for (const modifier of [
    'jump-start',
    'jump-end',
    'jump-none',
    'jump-both',
  ] as const) {
    test(`steps(4, ${modifier}) draws each step at its boundary`, async () => {
      const transition = { propertyCase: OPACITY, easing: steps(4, modifier) };
      expectOnCurve(
        `steps(4, ${modifier})`,
        await play(transition),
        transition
      );
    });
  }

  test('a linear() easing with a jump draws the jump', async () => {
    const transition = {
      propertyCase: OPACITY,
      easing: linear(0, [0, '50%'], [1, '50%'], 1),
    };
    expectOnCurve('linear() with a jump', await play(transition), transition);
  });

  test('a color interruption at 50 % continues from the drawn color', async () => {
    let interruptedAtMs = 0;
    const { samples, started, frameCallbacks } = await play(
      { propertyCase: BACKGROUND_COLOR },
      async () => {
        await waitClock(DURATION / 2);
        interruptedAtMs = await uptimeMs();
        await render(
          <ValueBox propertyCase={BACKGROUND_COLOR} value={GREEN.style} />
        );
        await waitClock(DURATION + SETTLE_MS);
      }
    );
    logDrawnValues('color interruption', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(BACKGROUND_COLOR)],
      frameCallbacks,
    });
    expect(
      jumpsAfter(
        samples,
        'backgroundColor',
        interruptedAtMs,
        maxStepOf(BACKGROUND_COLOR)
      )
    ).toBe('');
    expect(lastValueOf(samples)).toBe(GREEN.drawn);
  });

  test('a scalar reversal at 50 % continues from the drawn value and ends early', async () => {
    let reversedAtMs = 0;
    const { samples, started, frameCallbacks } = await play(
      { propertyCase: OPACITY },
      async () => {
        await waitClock(DURATION / 2);
        reversedAtMs = await uptimeMs();
        await render(<ValueBox propertyCase={OPACITY} value={1} />);
        await waitClock(DURATION + SETTLE_MS);
      }
    );
    logDrawnValues('scalar reversal', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(OPACITY)],
      frameCallbacks,
    });
    expect(
      jumpsAfter(samples, 'opacity', reversedAtMs, maxStepOf(OPACITY))
    ).toBe('');
    expect(lastValueOf(samples)).toBe(1);
    const ended = firstSampleOf(
      samples,
      'the end of the reversal',
      ({ timeMs, values }) =>
        timeMs > reversedAtMs + FRAME_MS && values[0] === 1
    );
    // The reversal of a half-done linear transition takes half of the duration.
    const reversalMs = (DURATION / 2) * clockScale();
    expect(ended.timeMs - reversedAtMs).toBeWithinRange(
      reversalMs - 3 * FRAME_MS,
      reversalMs + START_APPLY_MS + clockScale()
    );
  });

  test('a reversal twice continues from the drawn value each time', async () => {
    let firstReversalAtMs = 0;
    const { samples, started, frameCallbacks } = await play(
      { propertyCase: OPACITY },
      async () => {
        await waitClock(DURATION / 2);
        firstReversalAtMs = await uptimeMs();
        await render(<ValueBox propertyCase={OPACITY} value={1} />);
        await waitClock(DURATION / 8);
        await render(<ValueBox propertyCase={OPACITY} value={0.2} />);
        await waitClock(DURATION + SETTLE_MS);
      }
    );
    logDrawnValues('reversal twice', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(OPACITY)],
      frameCallbacks,
    });
    expect(
      jumpsAfter(samples, 'opacity', firstReversalAtMs, maxStepOf(OPACITY))
    ).toBe('');
    expect(lastValueOf(samples)).toBe(0.2);
  });

  test('a reversal in the delay keeps the start value', async () => {
    const { samples, started, frameCallbacks } = await play(
      { propertyCase: OPACITY, delay: DURATION },
      async () => {
        await waitClock(DURATION / 2);
        await render(
          <ValueBox propertyCase={OPACITY} value={1} delay={DURATION} />
        );
        await waitClock(2 * DURATION + SETTLE_MS);
      }
    );
    logDrawnValues('reversal in the delay', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(OPACITY)],
      delayMs: DURATION,
      frameCallbacks,
    });
    expect(
      [...valuesAfter(samples, 0)].filter((value) => value !== 1).join(', ')
    ).toBe('');
  });

  test('a positive delay holds the start value, then draws the CSS curve', async () => {
    const transition = { propertyCase: OPACITY, delay: DURATION / 2 };
    expectOnCurve('positive delay', await play(transition), transition);
  });

  test('a negative delay starts inside the CSS curve', async () => {
    const transition = { propertyCase: OPACITY, delay: -DURATION / 2 };
    expectOnCurve('negative delay', await play(transition), transition);
  });

  test('a zero duration draws the end value at once', async () => {
    const transition = { propertyCase: OPACITY, duration: 0 };
    expectOnCurve('zero duration', await play(transition), transition);
  });

  test('a zero duration with a delay draws the end value after the delay', async () => {
    const transition = { propertyCase: OPACITY, duration: 0, delay: DURATION };
    expectOnCurve(
      'zero duration with a delay',
      await play(transition),
      transition
    );
  });

  test('two properties of one view play their own durations, and a removal of one keeps the other', async () => {
    const { samples, started, removed, frameCallbacks } =
      await playTwoProperties();
    logDrawnValues('two properties', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(BACKGROUND_COLOR), startValueOf(OPACITY)],
      frameCallbacks,
    });
    const background = curveOfTransition({
      propertyCase: BACKGROUND_COLOR,
      duration: 2 * DURATION,
    });
    expect(
      curveFaults(background, originsOf(started, 0), [
        { samples, valueIndex: 0 },
      ])
    ).toBe('');
    expect(
      curveFaults(
        curveOfTransition({ propertyCase: OPACITY }),
        originsOf(started, 0),
        [
          {
            samples: samples.filter(
              ({ timeMs }) => timeMs < removed.earliestMs
            ),
            valueIndex: 1,
          },
        ],
        false
      )
    ).toBe('');
    expect(cancellationFaults(samples, OPACITY, removed, 1)).toBe('');
  });

  test('a cancellation in motion keeps the drawn value', async () => {
    let cancelled: RenderInterval = { earliestMs: 0, latestMs: 0 };
    const { samples, started, frameCallbacks } = await play(
      { propertyCase: OPACITY },
      async () => {
        await waitClock(DURATION / 2);
        cancelled = await renderTimed(
          <ValueBox
            propertyCase={OPACITY}
            value={0.2}
            transitionProperty="none"
          />
        );
        await waitClock(DURATION + SETTLE_MS);
      }
    );
    logDrawnValues('cancellation in motion', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(OPACITY)],
      frameCallbacks,
    });
    expect(cancellationFaults(samples, OPACITY, cancelled)).toBe('');
    expect(lastValueOf(samples)).toBeWithinRange(
      0.2 + OPACITY.tolerance,
      1 - OPACITY.tolerance
    );
  });

  test('a cancellation in the delay keeps the drawn value', async () => {
    let cancelled: RenderInterval = { earliestMs: 0, latestMs: 0 };
    const { samples, started, frameCallbacks } = await play(
      { propertyCase: OPACITY, delay: DURATION },
      async () => {
        await waitClock(DURATION / 2);
        cancelled = await renderTimed(
          <ValueBox
            propertyCase={OPACITY}
            value={0.2}
            delay={DURATION}
            transitionProperty="none"
          />
        );
        await waitClock(DURATION + SETTLE_MS);
      }
    );
    logDrawnValues('cancellation in the delay', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(OPACITY)],
      delayMs: DURATION,
      frameCallbacks,
    });
    expect(cancellationFaults(samples, OPACITY, cancelled)).toBe('');
    expect(
      [...valuesAfter(samples, 0)].filter((value) => value !== 1).join(', ')
    ).toBe('');
  });

  test('a replacement and a cancellation in successive commits keep the drawn value', async () => {
    const { samples, started, cancelled, frameCallbacks } =
      await playRapidReplacements();
    logDrawnValues('rapid replacements', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(OPACITY)],
      frameCallbacks,
    });
    expect(cancellationFaults(samples, OPACITY, cancelled)).toBe('');
  });

  test('a held value stays through an unrelated commit and an animated style, and the next start releases it', async () => {
    const { samples, heldFromMs, releasedAtMs } = await playHeldValue();
    logDrawnValues('held value', samples, {
      startValues: [startValueOf(OPACITY, SEED_OPACITY)],
    });
    const held = samples.filter(
      ({ timeMs }) => timeMs >= heldFromMs && timeMs < releasedAtMs
    );
    expect([...new Set(held.map(({ values }) => values[0]))].join(', ')).toBe(
      String(FOCUSED_OPACITY)
    );
    expect(lastValueOf(samples)).toBe(SEED_OPACITY);
  });

  test('a Fabric transform commit during an opacity run keeps the CSS curve', async () => {
    const transition = { propertyCase: OPACITY };
    const played = await play(transition, async () => {
      await waitClock(DURATION / 4);
      await render(
        <ValueBox
          propertyCase={OPACITY}
          value={0.2}
          extraStyle={{ transform: [{ translateX: 10 }] }}
        />
      );
      await waitClock(DURATION + SETTLE_MS);
    });
    expectOnCurve('transform commit', played, transition);
  });

  test('with animators off, a transition draws the CSS curve and takes no host route', async () => {
    if ((await animatorDurationScale()) !== 0) {
      return;
    }
    const hasHost = await nativeAnimationHostExists();
    const transition = { propertyCase: OPACITY };
    const played = await play(transition);
    expectOnCurve('animators off', played, transition);
    if (hasHost) {
      expect(summarize(played.events)).toBe('');
    }
  });

  test('a start in the same JS turn as a style commit never draws the target first', async () => {
    const targets = Array.from({ length: 30 }, (_, index) =>
      index % 2 === 0 ? 0.2 : 1
    );
    await render(<ValueBox propertyCase={OPACITY} value={1} />);
    await wait(50);
    const tag = getTestComponent(BOX_REF).getTag();
    const startTimes: number[] = [];
    const samples = await recordDrawnValues(tag, ['opacity'], async () => {
      for (const [index, target] of targets.entries()) {
        startTimes.push(await uptimeMs());
        await render(
          <ValueBox
            propertyCase={OPACITY}
            value={target}
            extraStyle={{ width: 80 + (index % 2) }}
          />
        );
        await waitClock(DURATION + SETTLE_MS / 2);
      }
    });
    logDrawnValues('start with a style commit', samples, {
      startValues: [startValueOf(OPACITY)],
    });
    const targetFirst = targets.filter((target, index) => {
      const startValue = index === 0 ? 1 : targets[index - 1];
      const firstChange = samples.find(
        ({ timeMs, values }) =>
          timeMs >= startTimes[index] &&
          Math.abs(values[0] - startValue) > OPACITY.tolerance
      );
      return (
        firstChange !== undefined &&
        Math.abs(firstChange.values[0] - target) <= OPACITY.tolerance
      );
    });
    expect(targetFirst.length).toBe(0);
  });

  test('a view with a transition callback draws the CSS curve on the loop', async () => {
    const hasHost = await nativeAnimationHostExists();
    const transition = { propertyCase: OPACITY };
    await render(
      <ValueBox propertyCase={OPACITY} value={1} onCSSTransitionStart={noop} />
    );
    await wait(50);
    await takeTrace();
    const tag = getTestComponent(BOX_REF).getTag();
    let started: RenderInterval = { earliestMs: 0, latestMs: 0 };
    const { samples, frameCallbacks } =
      await recordDrawnValuesAndFrameCallbacks(tag, ['opacity'], async () => {
        started = await renderTimed(
          <ValueBox
            propertyCase={OPACITY}
            value={0.2}
            onCSSTransitionStart={noop}
          />
        );
        await waitClock(DURATION + SETTLE_MS);
      });
    expectOnCurve(
      'transition callback',
      { samples, started, frameCallbacks },
      transition
    );
    if (hasHost) {
      expect(
        summarize((await takeTrace()).filter((event) => event.tag === tag))
      ).toBe('');
    }
  });

  test('a settings-only update keeps the running transition', async () => {
    const transition = { propertyCase: OPACITY };
    const played = await play(transition, async () => {
      await waitClock(DURATION / 4);
      await render(
        <ValueBox propertyCase={OPACITY} value={0.2} duration={2 * DURATION} />
      );
      await waitClock(DURATION + SETTLE_MS);
    });
    expectOnCurve('settings-only update', played, transition);
  });

  test('a transition in a Modal draws the CSS curve', async () => {
    const transition = { propertyCase: OPACITY };
    const ModalBox = ({ value }: { value: number }) => (
      <Modal visible transparent animationType="none">
        <ValueBox propertyCase={OPACITY} value={value} />
      </Modal>
    );
    await render(<ModalBox value={1} />);
    await wait(300);
    const tag = getTestComponent(BOX_REF).getTag();
    let started: RenderInterval = { earliestMs: 0, latestMs: 0 };
    const { samples, frameCallbacks } =
      await recordDrawnValuesAndFrameCallbacks(tag, ['opacity'], async () => {
        started = await renderTimed(<ModalBox value={0.2} />);
        await waitClock(DURATION + SETTLE_MS);
      });
    await render(null);
    await wait(300);
    expectOnCurve('Modal', { samples, started, frameCallbacks }, transition);
  });

  test('100 views that start one cubic curve in one commit draw it in one phase', async () => {
    const { samples, started, frameCallbacks } = await playCrowd();
    logDrawnValues('crowd', samples, {
      renderStartMs: started.earliestMs,
      startValues: [startValueOf(OPACITY), startValueOf(OPACITY)],
      frameCallbacks,
    });
    const curve = curveOfTransition({
      propertyCase: OPACITY,
      easing: EASE_IN_OUT,
    });
    expect(
      curveFaults(curve, originsOf(started, 0), [
        { samples, valueIndex: 0 },
        { samples, valueIndex: 1 },
      ])
    ).toBe('');
    const phaseSteps = samples
      .filter(
        ({ values }) =>
          Math.abs(values[0] - values[1]) > (OPACITY.tolerance * 3) / 2
      )
      .map(({ values }) => `${values[0]} and ${values[1]}`);
    expect(phaseSteps.join(', ')).toBe('');
  });
}

function registerRouteCases() {
  test('a settings-only update starts no command', async () => {
    if (!(await nativeAnimationHostExists()) || !(await animatorsEnabled())) {
      return;
    }
    const { events } = await play({ propertyCase: OPACITY }, async () => {
      await waitClock(DURATION / 4);
      await render(
        <ValueBox propertyCase={OPACITY} value={0.2} duration={2 * DURATION} />
      );
      await waitClock(DURATION + SETTLE_MS);
    });
    expect(summarize(events)).toBe(
      'Received > TrackStarted:Opacity > Admitted > TrackEnded:Opacity > Ended:Finished:None'
    );
  });

  test('a removal of one of two properties stops its own track and keeps the other', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    let playbacks: string[] = [];
    const { events } = await playTwoProperties(async (tag) => {
      playbacks = playbackIdsOf(await sample(tag, 'BackgroundColor'));
    });
    if (!(await animatorsEnabled())) {
      expect(summarize(events)).toBe('');
      return;
    }
    const startOf = (target: string) =>
      trackStartOf(events, target, (event) => event.target === target);
    const opacity = startOf('Opacity');
    const background = startOf('BackgroundColor');
    expect(playbacks.join(', ')).toBe(
      `CSSTransition ${background.surfaceId}.${background.tag}.${background.generation} BackgroundColor`
    );
    const endOf = ({ generation }: TraceEvent) =>
      events.find(
        (event) => event.event === 'Ended' && event.generation === generation
      )?.outcome;
    expect(endOf(opacity)).toBe('Cancelled');
    expect(endOf(background)).toBe('Finished');
  });

  test('a held value is a held host track until the blur', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    let heldPlaybacks: string[] = [];
    const { events } = await playHeldValue(async (tag) => {
      heldPlaybacks = playbackIdsOf(await sample(tag, 'Opacity'));
    });
    if (!(await animatorsEnabled())) {
      expect(summarize(events)).toBe('');
      return;
    }
    const held = trackStartOf(
      events,
      'the held track',
      ({ endpointPolicy }) => endpointPolicy === 'HoldWithoutCommit'
    );
    expect(heldPlaybacks.join(', ')).toBe(
      `CSSTransition ${held.surfaceId}.${held.tag}.${held.generation} Opacity`
    );
    const ofHeld = events.filter(
      ({ generation }) => generation === held.generation
    );
    expect(summarize(ofHeld)).toBe(
      'Received > TrackStarted:Opacity > Admitted > TrackEnded:Opacity > Ended:Interrupted:None'
    );
  });

  test('a replacement and a cancellation in successive commits give one result for each command', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const { events } = await playRapidReplacements();
    if (!(await animatorsEnabled())) {
      expect(summarize(events)).toBe('');
      return;
    }
    const generations = [
      ...new Set(
        events
          .filter(({ event }) => event === 'Received')
          .map(({ generation }) => generation)
      ),
    ];
    expect(generations.length).toBe(2);
    const outcomes = generations.map((generation) =>
      events
        .filter(
          (event) => event.event === 'Ended' && event.generation === generation
        )
        .map(({ outcome }) => outcome)
        .join(', ')
    );
    expect(outcomes.join(' > ')).toBe('Interrupted > Cancelled');
  });

  test('a deletion of the view right after a start ends its command once', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    await render(<ValueBox propertyCase={OPACITY} value={1} />);
    await wait(50);
    await takeTrace();
    const tag = getTestComponent(BOX_REF).getTag();
    await render(<ValueBox propertyCase={OPACITY} value={0.2} />);
    await render(<View />);
    await waitClock(DURATION + SETTLE_MS);
    const events = (await takeTrace()).filter((event) => event.tag === tag);
    const ended = events.filter(({ event }) => event === 'Ended');
    console.log(
      `RuntimeTestsViewSampler deletion after a start: ${summarize(events)}`
    );
    if (!(await animatorsEnabled())) {
      expect(summarize(events)).toBe('');
      return;
    }
    expect(events.filter(({ event }) => event === 'Received').length).toBe(1);
    expect(ended.length).toBe(1);
    expect(
      ['Cancelled', 'Rejected', 'SurfaceDestroyed'].includes(
        ended[0]?.outcome ?? ''
      )
    ).toBe(true);
  });

  test('100 views that start in one commit are 100 commands', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const { events } = await playCrowd();
    const admitted = events.filter(({ event }) => event === 'Admitted');
    console.log(
      `RuntimeTestsViewSampler crowd first to last admission ${
        admitted.length > 0
          ? (
              admitted[admitted.length - 1].monotonicTimeMs -
              admitted[0].monotonicTimeMs
            ).toFixed(2)
          : 'none'
      } ms`
    );
    expect(admitted.length).toBe((await animatorsEnabled()) ? CROWD_SIZE : 0);
  });
}

function noop() {}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  box: {
    width: 80,
    height: 80,
    backgroundColor: 'navy',
    borderWidth: 4,
    borderColor: 'black',
    elevation: 4,
  },
  crowd: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  crowdBox: {
    width: 20,
    height: 20,
    backgroundColor: 'navy',
  },
});
