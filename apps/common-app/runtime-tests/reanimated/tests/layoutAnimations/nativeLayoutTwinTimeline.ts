/*
 * The twin timeline: the time error of a native value against the recorded frames of the frame-driven twin.
 *
 * A quantity is one scalar of a native sample. Its frames are the frame times of the records of its keys,
 * with no value between two frames. For a read at `t`, the window `W` holds the frame times that the read can
 * show (`frameTimesOf`). The time error has two bounds from the frames only:
 * - `e_hi`: a time with a match is at most this far from `W`, if the twin is continuous inside one record.
 * - `e_lo`: no time with a match is nearer to `W`, if the twin does not turn between two frames.
 * Apple asserts `e_lo` against one display frame; the read is proven when `e_hi` is inside one display frame.
 * Android prints the rows and does not assert: its window is wider than one display frame.
 *
 * Limits: a turn or a step of the twin between two frames by more than the tolerance past both frame values
 * can fail a read inside the contract. A delayed timing to the same end value adopts the start of the timing
 * that it replaced at the end of the delay, inside one record, so `e_hi` can be smaller than the time error
 * there. No converted test has such a timing.
 */
import { Platform } from 'react-native';

import { expect, getTestComponent } from '../../../ReJest/RuntimeTestsApi';
import type {
  Band,
  FrameRecord,
  LaidOutValues,
  MatrixTolerance,
  TargetSample,
} from './nativeLayoutTestKit';
import {
  amountOf,
  BOX_REF,
  cellsOf,
  cellToleranceOf,
  FRAME_BOX_REF,
  FRAME_MS,
  frameTimesOf,
  isOperationRecord,
  laidOutValuesOf,
  layerPositionOf,
  mountOffsetOf,
  narrowClockOffset,
  OPACITY_TOLERANCE,
  POSITION_TOLERANCE,
  readFrameRecords,
  sample,
} from './nativeLayoutTestKit';

const ASSERTS_TWIN_TIMELINE = Platform.OS === 'ios';

type Value = number | string;

export type TwinKnot = {
  timeMs: number;
  value: Value;
  record: number;
  isLast: boolean;
};

/** The frames of the records of one leaf of one box, in time order. */
export function twinTimelineOf(
  records: FrameRecord[],
  box: string,
  key: string,
  operation?: number
): TwinKnot[] {
  return records
    .flatMap((record, index) =>
      record.box === box && record.key === key && record.operation === operation
        ? record.frames.map(({ timeMs, value }, frame) => ({
            timeMs,
            value,
            record: index,
            isLast: frame === record.frames.length - 1,
          }))
        : []
    )
    .sort((first, second) => first.timeMs - second.timeMs);
}

/** A leaf of a quantity: its frames, or the value at rest when it has none. */
export type TwinKey = { knots: TwinKnot[]; rest: Value };

export type TwinQuantity = {
  name: string;
  keys: TwinKey[];
  valueOf: (values: Value[]) => number;
  tolerance: number;
};

type KeyState =
  | { side: 'before' | 'after' | 'rest' }
  | { record: number; isLast: boolean };

export type QuantityFrame = {
  timeMs: number;
  value: number;
  states: KeyState[];
};

/**
 * The frames of a quantity: each time at which each key has a frame, or is
 * before its first frame or after its last frame. A quantity with no frame
 * holds its value at rest at each time: one frame before each time.
 */
export function quantityFramesOf({
  keys,
  valueOf,
}: TwinQuantity): QuantityFrame[] {
  if (keys.every(({ knots }) => knots.length === 0)) {
    return [
      {
        timeMs: -Infinity,
        value: valueOf(keys.map(({ rest }) => rest)),
        states: keys.map(() => ({ side: 'rest' })),
      },
    ];
  }
  const knotsAt = keys.map(
    ({ knots }) => new Map(knots.map((knot) => [knot.timeMs, knot]))
  );
  const times = [
    ...new Set(keys.flatMap(({ knots }) => knots.map(({ timeMs }) => timeMs))),
  ].sort((first, second) => first - second);
  return times.flatMap((timeMs) => {
    const values: Value[] = [];
    const states: KeyState[] = [];
    for (const [index, { knots, rest }] of keys.entries()) {
      const knot = knotsAt[index].get(timeMs);
      if (knots.length === 0) {
        values.push(rest);
        states.push({ side: 'rest' });
      } else if (knot) {
        values.push(knot.value);
        states.push({ record: knot.record, isLast: knot.isLast });
      } else if (timeMs < knots[0].timeMs) {
        values.push(knots[0].value);
        states.push({ side: 'before' });
      } else if (timeMs > knots[knots.length - 1].timeMs) {
        values.push(knots[knots.length - 1].value);
        states.push({ side: 'after' });
      } else {
        return [];
      }
    }
    return [{ timeMs, value: valueOf(values), states }];
  });
}

type Span = { from: number; to: number };

const nearOf = (window: Band, { from, to }: Span) =>
  Math.max(0, from - window.to, window.from - to);

const farOf = (window: Band, { from, to }: Span) =>
  Math.max(0, window.from - from, to - window.to);

const isInOneRecord = (start: KeyState, end: KeyState) =>
  'side' in start
    ? 'side' in end && start.side === end.side
    : !('side' in end) && start.record === end.record && !end.isLast;

type Bound = { ms: number; span?: Span; values?: number[] };

export type TwinTimeError = {
  low: Bound;
  high: Bound;
  hull: QuantityFrame[][];
  hasMatch: boolean;
};

/**
 * The two bounds of the time error of the native value `native` against
 * `frames`, from the window `window`.
 */
export function twinTimeErrorOf(
  frames: QuantityFrame[],
  native: number,
  tolerance: number,
  window: Band
): TwinTimeError {
  const isMatch = (value: number) => Math.abs(value - native) <= tolerance;
  const points: Bound[] = frames
    .filter(({ value }) => isMatch(value))
    .map(({ timeMs, value }) => ({
      ms: nearOf(window, { from: timeMs, to: timeMs }),
      span: { from: timeMs, to: timeMs },
      values: [value],
    }));
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (first && isMatch(first.value)) {
    points.push({
      ms: nearOf(window, { from: -Infinity, to: first.timeMs }),
      span: { from: -Infinity, to: first.timeMs },
      values: [first.value],
    });
  }
  if (last && isMatch(last.value)) {
    points.push({
      ms: nearOf(window, { from: last.timeMs, to: Infinity }),
      span: { from: last.timeMs, to: Infinity },
      values: [last.value],
    });
  }
  const hull: QuantityFrame[][] = [];
  const low: Bound[] = [...points];
  const high: Bound[] = [...points];
  for (let index = 0; index + 1 < frames.length; index++) {
    const start = frames[index];
    const end = frames[index + 1];
    const span = { from: start.timeMs, to: end.timeMs };
    const values = [start.value, end.value];
    const smallest = Math.min(...values);
    const largest = Math.max(...values);
    if (smallest - tolerance <= native && native <= largest + tolerance) {
      hull.push([start, end]);
      low.push({ ms: nearOf(window, span), span, values });
    }
    if (
      smallest <= native &&
      native <= largest &&
      start.states.every((state, key) => isInOneRecord(state, end.states[key]))
    ) {
      high.push({ ms: farOf(window, span), span, values });
    }
  }
  const leastOf = (bounds: Bound[]): Bound =>
    bounds.reduce((least, bound) => (bound.ms < least.ms ? bound : least), {
      ms: Infinity,
    });
  return {
    low: leastOf(low),
    high: leastOf(high),
    hull,
    hasMatch: low.length > 0,
  };
}

export type TwinResult = 'proven' | 'not resolved' | 'failed' | 'not proven';

export type TwinRead = {
  quantity: TwinQuantity;
  /** The `monotonicTimeMs` of the native sample of the value. */
  t: number;
  native: number;
};

export type TwinReadResult = TwinTimeError & {
  read: TwinRead;
  window: Band;
  result: TwinResult;
};

const describeBound = ({ ms, span, values }: Bound) =>
  span && values
    ? `${ms.toFixed(3)} ms at ${span.from.toFixed(3)}..${span.to.toFixed(3)} (${values.map((value) => value.toFixed(4)).join(', ')})`
    : 'none';

const describeFrames = (frames: QuantityFrame[]) =>
  frames
    .map(({ timeMs, value }) => `${timeMs.toFixed(3)}: ${value.toFixed(4)}`)
    .join(', ');

function resultOf({ low, high, hasMatch }: TwinTimeError): TwinResult {
  if (!ASSERTS_TWIN_TIMELINE) {
    return 'not proven';
  }
  if (!hasMatch || low.ms > FRAME_MS) {
    return 'failed';
  }
  return high.ms <= FRAME_MS ? 'proven' : 'not resolved';
}

/**
 * Prints a `TWIN-TIMELINE` row for each read and a `TWIN-TIMELINE-BLOCK` row of
 * the counts. Apple asserts that no read failed.
 */
export function expectTwinReads(
  caseName: string,
  reads: TwinRead[],
  clockOffset: Band
): TwinReadResult[] {
  const results = reads.map((read): TwinReadResult => {
    const window = frameTimesOf({ from: read.t, to: read.t }, clockOffset);
    const frames = quantityFramesOf(read.quantity);
    const error = twinTimeErrorOf(
      frames,
      read.native,
      read.quantity.tolerance,
      window
    );
    const result = resultOf(error);
    const windowWidth = window.to - window.from;
    console.log(
      [
        'TWIN-TIMELINE',
        caseName,
        read.quantity.name,
        read.t.toFixed(3),
        read.native.toFixed(4),
        `${window.from.toFixed(3)}, ${window.to.toFixed(3)}`,
        windowWidth.toFixed(3),
        (clockOffset.to - clockOffset.from).toFixed(3),
        error.hasMatch ? describeBound(error.low) : 'no match',
        error.high.span
          ? describeBound(error.high)
          : `none; hull ${error.hull.map(describeFrames).join('; ')}`,
        result === 'not proven'
          ? `not proven: window ${windowWidth.toFixed(3)} ms`
          : result,
        error.hasMatch ? '' : `frames ${describeFrames(frames)}`,
      ].join(' | ')
    );
    return { ...error, read, window, result };
  });
  const countOf = (result: TwinResult) =>
    results.filter((each) => each.result === result).length;
  console.log(
    [
      'TWIN-TIMELINE-BLOCK',
      caseName,
      `proven ${countOf('proven')}`,
      `not resolved ${countOf('not resolved')}`,
      `failed ${countOf('failed')}`,
      `not proven ${countOf('not proven')}`,
      `largest e_hi ${Math.max(...results.map(({ high }) => high.ms)).toFixed(3)} ms`,
    ].join(' | ')
  );
  expect(
    results
      .filter(({ result }) => result === 'failed')
      .map(
        ({ read, low }) =>
          `${read.quantity.name} ${read.native.toFixed(4)} at ${read.t.toFixed(3)}: e_lo ${low.ms.toFixed(3)} ms`
      )
      .join('; ')
  ).toBe('');
  return results;
}

/**
 * The values of the frame-driven box after the last commit, for its keys with
 * no frames.
 */
export type TwinRest = LaidOutValues & { opacity: number };

export type PairQuantity =
  | 'Position x'
  | 'Position y'
  | 'Width'
  | 'Height'
  | 'Opacity';

export type PairRead = {
  quantity: PairQuantity;
  t: number;
  native: number;
  rest: TwinRest;
};

type Offset = { x: number; y: number };

/**
 * The twin of a pair scene: the offset of the native box, the offset of the
 * recorded origins of the frame-driven box, and the clock offset. A laid-out
 * origin is in the shadow parent of its box; a recorded origin is in the
 * mounted parent of the frame-driven box.
 */
export type TwinPair = {
  offset: Offset;
  recordOffset: Offset;
  clockOffset: Band;
};

/** Reads the twin of a pair scene at rest after its mount. */
export async function twinPairOf(nativeTag: number): Promise<TwinPair> {
  const clockOffset = await narrowClockOffset(nativeTag);
  const offset = await mountOffsetOf(nativeTag, BOX_REF);
  const recordOffset = await mountOffsetOf(
    getTestComponent(FRAME_BOX_REF).getTag(),
    FRAME_BOX_REF
  );
  return { offset, recordOffset, clockOffset };
}

export const twinRestFrom = (values: Record<string, number>): TwinRest => ({
  originX: values.originX,
  originY: values.originY,
  width: values.width,
  height: values.height,
  opacity: values.opacity,
});

export async function twinRestOf(frameTag: number): Promise<TwinRest> {
  const [laidOut, opacity] = await Promise.all([
    laidOutValuesOf(FRAME_BOX_REF),
    sample(frameTag, 'Opacity'),
  ]);
  return twinRestFrom({ ...laidOut, opacity: opacity.model[0] });
}

/** The reads of the two values of a `Position` sample. */
export const positionReadsOf = (
  position: TargetSample,
  rest: TwinRest,
  [x, y] = position.presentation
): PairRead[] => [
  { quantity: 'Position x', t: position.monotonicTimeMs, native: x, rest },
  { quantity: 'Position y', t: position.monotonicTimeMs, native: y, rest },
];

const SCALAR_KEYS = {
  Width: 'width',
  Height: 'height',
  Opacity: 'opacity',
} as const;

const pairQuantityOf = (
  records: FrameRecord[],
  { offset, recordOffset }: TwinPair,
  { quantity, rest }: PairRead
): TwinQuantity => {
  const keyOf = (key: keyof TwinRest, knotOffset = 0): TwinKey => ({
    knots: twinTimelineOf(records, 'frame', key).map((knot) => ({
      ...knot,
      value: amountOf(knot.value).amount - knotOffset,
    })),
    rest: rest[key],
  });
  const amounts = (values: Value[]) =>
    values.map((value) => amountOf(value).amount);
  switch (quantity) {
    case 'Position x':
    case 'Position y': {
      const isX = quantity === 'Position x';
      return {
        name: quantity,
        keys: [
          isX
            ? keyOf('originX', recordOffset.x)
            : keyOf('originY', recordOffset.y),
          keyOf(isX ? 'width' : 'height'),
        ],
        valueOf: (values) => {
          const [origin, size] = amounts(values);
          return (isX ? offset.x : offset.y) + layerPositionOf(origin, size);
        },
        tolerance: POSITION_TOLERANCE,
      };
    }
    case 'Width':
    case 'Height':
    case 'Opacity':
      return {
        name: quantity,
        keys: [keyOf(SCALAR_KEYS[quantity])],
        valueOf: (values) => amounts(values)[0],
        tolerance:
          quantity === 'Opacity' ? OPACITY_TOLERANCE : POSITION_TOLERANCE,
      };
  }
};

/**
 * Checks the reads of the native box of a pair scene against the recorded
 * frames of its frame-driven box, from the records since `resetFrameRecords`.
 */
export function expectOnTwinTimeline(
  caseName: string,
  pair: TwinPair,
  reads: PairRead[]
) {
  return expectTwinReads(
    caseName,
    pairTwinReadsOf(readFrameRecords(), pair, reads),
    pair.clockOffset
  );
}

/** The reads of the native box of a pair against the frames of `records`. */
export const pairTwinReadsOf = (
  records: FrameRecord[],
  pair: TwinPair,
  reads: PairRead[]
): TwinRead[] =>
  reads.map((read) => ({
    quantity: pairQuantityOf(records, pair, read),
    t: read.t,
    native: read.native,
  }));

/**
 * The 16 cells of the `Transform` model of a box as quantities: each operation
 * of the records is a key.
 */
export function cellQuantitiesOf(
  records: FrameRecord[],
  box: string,
  matrixTolerance: MatrixTolerance
): TwinQuantity[] {
  const operations = [
    ...new Map(
      records
        .filter(isOperationRecord)
        .filter((record) => record.box === box)
        .map(({ key, operation }) => [operation, key])
    ),
  ].sort(([first], [second]) => first - second);
  const keys = operations.map(([operation, kind]) => ({
    knots: twinTimelineOf(records, box, kind, operation),
    rest: 0,
  }));
  return Array.from({ length: 16 }, (_, cell) => ({
    name: `Transform cell ${cell}`,
    keys,
    valueOf: (values: Value[]) =>
      cellsOf(
        values.map((value, index) => ({
          kind: operations[index][1],
          ...amountOf(value),
        })),
        'rest'
      )[cell],
    tolerance: cellToleranceOf(cell, matrixTolerance),
  }));
}

/**
 * A pair helper keeps the old pair comparison where the twin timeline does not
 * assert.
 */
export const KEEPS_PAIR_COMPARISON = !ASSERTS_TWIN_TIMELINE;

/** The old pair comparison, where the twin timeline does not assert. */
export function expectKeptPair(isNear: boolean) {
  if (KEEPS_PAIR_COMPARISON) {
    expect(isNear).toBe(true);
  }
}
