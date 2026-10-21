/*
 * Each test that plays a case (`playCase`) has the method of the suite `native layout reference`, each box
 * on its own clock: each sample of the native box is on the declared timeline of its key at the time of the
 * sample from the origin of its command (statement A), each frame of the frame-driven twin and of the
 * frame driver on the native box is on a replay of the declared timeline at its frame time (statement B),
 * and at the end the native box shows its model and the twin has the same model. A check of a playback key
 * count or of a held size in such a test is for each row, by the time of the row against the times of the
 * trace. Each other test has state checks and trace checks at planned times.
 *
 * The method does not prove: the distance of the two boxes at one instant, the lag of the frame driver,
 * that the two starts are in one display frame, when a callback comes or the gap of two callbacks, that a
 * row comes in each part of a timeline, a native value in the first display frame after its origin to
 * better than one display frame. The pixels on screen, a device, and 120 Hz are not tested.
 *
 * Statement A has the edge hold of `native layout reference`. Within the read band, this suite cannot
 * distinguish the platform hold from a native segment that keeps its start value through eased progress
 * 0.001 or shows its end value from eased progress 0.999. The frame-driven twin keeps its exact curve check
 * without a hold allowance.
 *
 * The suite `native layout live clock` has the wall-clock statements for the cases of this suite in
 * `nativeLayoutLiveClockCases.ts`: the pair of the two boxes at one instant, the gap of the two end
 * callbacks, and a row of the native box in each phase.
 */

import { Easing, LinearTransition } from 'react-native-reanimated';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  MOVED_AND_RESIZED,
  SIZE_DURATION,
  SIZE_START,
} from './nativeLayoutLiveClockCases';
import type {
  CallbackBuilder,
  Place,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import { expectReference, play } from './nativeLayoutReferencePlay';
import type {
  Band,
  DeclaredKey,
  Leaf,
  ScalarKey,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  hasNativeLayoutRoute,
  movingGeometryTest,
  PLAYS_SIZE_CHANGE,
  declaredTimelineOf,
  declaredValueOf,
  layerPositionOf,
  routeOf,
  START_LEFT,
  END_LEFT,
  DURATION,
  LAID_OUT_TOLERANCE,
  POSITION_TOLERANCE,
  FIRST_FRAME_TRAVEL,
  FRAME_MS,
  centerOf,
  takeTraceOf,
  isHostEvent,
  sample,
  playbackCountOf,
  summarize,
  Scene,
  renderBox,
  NATIVE_START,
  NATIVE_END,
  summarizeEnd,
} from './nativeLayoutTestKit';

const REST_TOLERANCE = 0.01;
const LAYOUT_TARGETS = ['PositionX', 'PositionY', 'Width', 'Height'];

/**
 * Plays a case on the native box and on its frame-driven twin, with statements
 * A and B of `native layout reference` and the end of the two boxes.
 */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  const reads = expectReference(caseName, referenceCase, played);
  expectAtRest(played);
  return { ...played, reads };
}

/**
 * At the end the native box shows its model, and the twin has the model of the
 * native box, to one pixel: the twin lays out on its own place of the pixel
 * grid (measured on Android: a height of 49.904785 for the twin and 50.285721
 * for the native box in one place).
 */
function expectAtRest({ end }: Played) {
  for (const [target, { presentation, model }] of Object.entries(
    end?.native ?? {}
  )) {
    const twinTolerance =
      REST_TOLERANCE +
      (LAYOUT_TARGETS.includes(target) ? LAID_OUT_TOLERANCE : 0);
    model.forEach((value, index) => {
      expect(Math.abs(presentation[index] - value) < REST_TOLERANCE).toBe(true);
      expect(
        Math.abs(end!.frame[target].model[index] - value) < twinTolerance
      ).toBe(true);
    });
  }
}

function firstEventOf(events: TraceEvent[], name: string) {
  const found = events.find(({ event }) => event === name);
  if (!found) {
    throw new Error(`The trace has no ${name} event: ${summarize(events)}`);
  }
  return found;
}

describe('native layout starts after the mount of the final state', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'the final state mounts before admission and the model holds the endpoint',
    async () => {
      const tag = await renderBox();
      await render(<Scene left={END_LEFT} />);
      await wait(DURATION / 2);

      const events = await takeTraceOf(tag);
      expect(summarize(events.filter(isHostEvent))).toBe(NATIVE_START);
      expect(events[0].owner).toBe('Layout');
      expect(events[1].transactionNumber).toBe(events[0].transactionNumber);
      expect(events[3].endpointPolicy).toBe('MountedModelMustMatchEndpoint');

      const playing = await sample(tag, 'PositionX');
      const { model, presentation, monotonicTimeMs } = playing;
      expect(playing.playbacks.length).toBe(2);
      expect(playbackCountOf(playing, events[0].generation)).toBe(2);
      expect(
        Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      const progress = (monotonicTimeMs - events[0].monotonicTimeMs) / DURATION;
      const expectedX =
        centerOf(START_LEFT) + progress * (END_LEFT - START_LEFT);
      expect(
        Math.abs(presentation[0] - expectedX) <
          FIRST_FRAME_TRAVEL + POSITION_TOLERANCE
      ).toBe(true);

      await wait(DURATION);
      expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
      const end = await sample(tag, 'PositionX');
      expect(end.playbacks.length).toBe(0);
      expect(
        Math.abs(end.presentation[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      await render(null);
    }
  );
});

describe('native layout size', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const START = SIZE_START;
  const MOVED: Place = { left: 120, top: 40, width: 50, height: 50 };
  const RESIZED: Place = { left: 0, top: 0, width: 150, height: 90 };

  const startOf = (...targets: string[]) =>
    `LayoutStartPending > LayoutStartMounted > Received > ${targets
      .map((target) => `TrackStarted:${target}`)
      .join(' > ')} > Admitted`;
  const FOUR_TRACKS = startOf('PositionX', 'PositionY', 'Width', 'Height');

  const isStartEvent = ({ event }: TraceEvent) =>
    event !== 'TrackEnded' && event !== 'Ended';
  const summarizeStart = (events: TraceEvent[]) =>
    summarize(events.filter(isHostEvent).filter(isStartEvent));
  const summarizeResults = (events: TraceEvent[]) =>
    summarize(events.filter(({ event }) => event === 'Ended'));

  const linearLayout = (durationMs: number) =>
    LinearTransition.duration(durationMs).easing(Easing.linear);
  const LINEAR_LEAF: Leaf = { duration: SIZE_DURATION };
  const LINEAR: Pick<ReferenceCase, 'leaves' | 'builder'> = {
    leaves: {
      originX: LINEAR_LEAF,
      originY: LINEAR_LEAF,
      width: LINEAR_LEAF,
      height: LINEAR_LEAF,
    },
    builder: () => linearLayout(SIZE_DURATION) as unknown as CallbackBuilder,
  };

  const sizeCaseOf = (
    declaration: Pick<ReferenceCase, 'leaves' | 'builder'>,
    start: Place,
    end: Place,
    options: Pick<ReferenceCase, 'box' | 'alsoSampled'> = {}
  ): ReferenceCase => ({
    flow: 'layout',
    ...declaration,
    places: [start, end],
    totalMs: SIZE_DURATION,
    ...options,
  });

  /**
   * Android refuses a Width or Height track that changes
   * (`AndroidNativeAnimationPlatform::playsTarget`): the frame driver plays the
   * whole animation on the two boxes.
   */
  const sizeChangeOf = (referenceCase: ReferenceCase): ReferenceCase =>
    PLAYS_SIZE_CHANGE
      ? referenceCase
      : { ...referenceCase, isFrameDriven: true };
  const SIZE_FALLBACK_NAME =
    'keeps the whole animation frame-driven: UnsupportedTarget, and the frames of the frame driver on the two boxes are on its timeline';

  /**
   * The fallback evidence of a refused size change: the build failure, no
   * result of a native command, and a frame-driven route of `target` with
   * models on the declared timeline at their read times. An off-curve model
   * fails the same check.
   */
  function expectSizeFallback(played: Played, target: string) {
    const events = played.events.filter(
      ({ event }) => event !== 'FrameUpdateMounted'
    );
    expect(summarizeStart(events)).toBe('LayoutBuildFailed:UnsupportedTarget');
    expect(summarizeResults(events)).toBe('');
    const refusal = firstEventOf(events, 'LayoutBuildFailed');
    const valueAt = declaredTargetOf(played, target);
    const isOnTimeline = (model: number[], readMs: Band) =>
      isOnFrameDriverTimeline(valueAt, refusal.monotonicTimeMs, model, readMs);
    const reads = nativeReadsOf(played, target);
    const moving = reads.filter(
      ({ sample: { model, monotonicTimeMs } }, index) =>
        monotonicTimeMs > refusal.monotonicTimeMs &&
        index > 0 &&
        reads[index - 1].sample.model.join() !== model.join()
    );
    const picked = [0.25, 0.5, 0.75]
      .map((part) => moving[Math.floor(part * moving.length)])
      .filter(
        (read, index, all) =>
          read !== undefined &&
          all.findIndex(
            (other) => other?.sample.model.join() === read.sample.model.join()
          ) === index
      );
    console.log(
      'RuntimeTestsSizeFallback ' +
        JSON.stringify({
          target,
          picked: picked.map(({ sample: { model }, readMs }) => ({
            model,
            fromRefusalMs: {
              from: readMs.from - refusal.monotonicTimeMs,
              to: readMs.to - refusal.monotonicTimeMs,
            },
          })),
        })
    );
    const route = routeOf(
      events,
      refusal.tag,
      target,
      picked.map(({ sample, readMs }) => ({ ...sample, readMs })),
      ({ model, readMs }) => isOnTimeline(model, readMs)
    );
    expect(route.kind).toBe('frame-driven');
    expect(isOnTimeline([valueAt(Infinity)], picked[0].readMs)).toBe(false);
    for (const { row } of played.rows) {
      expect(row.native[target].playbacks.length).toBe(0);
    }
  }

  const linearCases: [string, Place, string][] = [
    ['a position change', MOVED, 'PositionX'],
    ['a position change and a size change', MOVED_AND_RESIZED, 'PositionX'],
    ['a size change', RESIZED, 'Width'],
  ];
  for (const [caseName, end, routeTarget] of linearCases) {
    const changesSize =
      end.width !== START.width || end.height !== START.height;
    const isNative = PLAYS_SIZE_CHANGE || !changesSize;
    const linearTest = isNative ? movingGeometryTest : test;
    linearTest(
      `LinearTransition with a linear easing ${isNative ? `plays ${caseName} on four native tracks, and the native values and the frames of the frame driver are on its timeline` : `with ${caseName} ${SIZE_FALLBACK_NAME}`}`,
      async () => {
        const referenceCase = sizeCaseOf(LINEAR, START, end);
        const played = await playCase(
          caseName,
          changesSize ? sizeChangeOf(referenceCase) : referenceCase
        );
        if (!isNative) {
          expectSizeFallback(played, routeTarget);
          await render(null);
          return;
        }
        expect(summarizeStart(played.events)).toBe(FOUR_TRACKS);
        expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
        await render(null);
      }
    );
  }
});

// The extremes of the lag of the frame driver from the refusal that iOS measured, in whole display frames.
// Android: not measured.
const FRAME_DRIVER_EARLY_MS = 2 * FRAME_MS;
const FRAME_DRIVER_LATE_MS = 5 * FRAME_MS;

/**
 * The declared value of `target` of the native box at a time from the start of
 * its timelines. A position target is the centre of the box.
 */
function declaredTargetOf({ endKeys }: Played, target: string) {
  const valueOfKey = ({ leaf, from, to, base }: DeclaredKey) =>
    declaredValueOf(declaredTimelineOf(leaf, from, to, base));
  const scalarKey = endKeys.find(
    (key): key is ScalarKey =>
      key.operation === undefined && key.target === target
  );
  if (!scalarKey) {
    throw new Error(`The case declares no key of the target ${target}.`);
  }
  const valueAt = valueOfKey(scalarKey);
  const { size } = scalarKey;
  if (!size) {
    return valueAt;
  }
  const sizeKey = endKeys.find(({ key }) => key === size.key);
  const sizeAt = sizeKey ? valueOfKey(sizeKey) : () => size.rest;
  return (timeMs: number) => layerPositionOf(valueAt(timeMs), sizeAt(timeMs));
}

type NativeRead = { sample: TargetSample; readMs: Band };

/**
 * Each sample of `target` of the native box after the first row, with the
 * interval of its read on the sample clock: a row starts its reads after the
 * last read of the row before it ends, and the host stamps a sample after its
 * read (`NativeAnimationHost::sampleTarget`).
 */
const nativeReadsOf = ({ rows }: Played, target: string): NativeRead[] =>
  rows.slice(1).map(({ row }, index) => ({
    sample: row.native[target],
    readMs: {
      from: Math.max(
        ...Object.values(rows[index].row).flatMap((samples) =>
          Object.values(samples).map(({ monotonicTimeMs }) => monotonicTimeMs)
        )
      ),
      to: row.native[target].monotonicTimeMs,
    },
  }));

/**
 * A model of a read in `readMs` is within `POSITION_TOLERANCE` of a declared
 * value of the frame driver, from `FRAME_DRIVER_LATE_MS` before the read to
 * `FRAME_DRIVER_EARLY_MS` after it, on the timeline from the refusal.
 */
function isOnFrameDriverTimeline(
  valueAt: (timeMs: number) => number,
  refusalMs: number,
  [value]: number[],
  readMs: Band
) {
  const fromMs = readMs.from - refusalMs - FRAME_DRIVER_LATE_MS;
  const toMs = readMs.to - refusalMs + FRAME_DRIVER_EARLY_MS;
  const declared = [toMs];
  for (let timeMs = fromMs; timeMs < toMs; timeMs += DECLARED_STEP_MS) {
    declared.push(timeMs);
  }
  const values = declared.map(valueAt);
  return (
    value >= Math.min(...values) - POSITION_TOLERANCE &&
    value <= Math.max(...values) + POSITION_TOLERANCE
  );
}

const DECLARED_STEP_MS = 1;
