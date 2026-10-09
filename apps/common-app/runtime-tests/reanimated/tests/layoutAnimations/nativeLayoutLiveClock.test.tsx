/*
 * The statements of the cases of `native layout reference` that need the wall clock. A frame-driven phase
 * starts in the first frame at or after the end of the phase before it, so phase number n of the twin
 * starts n display frames or less after its declared start, and a twin of n phases can be n display frames
 * behind its declared timeline with no late frame. The start of a phase is a computed start: the rules of
 * `replayFrames` give it for the frame times of the record. In a timeline whose first phase has no
 * duration, a timing or a delay, a phase can start one display frame or less before its declared start: the
 * start call of a layout animation steps the animation on the clock, the phase ends in that step, the next
 * timing moves its start back to its first frame, which can be before the call, and each later phase
 * follows that start. The size of one display frame is an inference from that code; measured: -0.891 ms.
 * In each other timeline a phase starts at or after its declared start.
 *
 * The pair: at one request step, the value that the native box shows and the value of its twin differ by
 * the tolerance of the key plus the declared change of the key from one display frame for each started
 * phase of the twin, one at the least, before the step to one display frame after it at most. The declared
 * value of a key is the value of the track that has the key at each time, as in statement A of
 * `native layout reference`: the replaced track before the `TrackStarted` time of a track that replaced it.
 * A position value is the center of the box. The pair of a `Transform` target is the 16 cells of its
 * matrix: the cells that the native box shows, and the cells of the operation values of the write of the
 * twin that the model of the twin shows, in the product order of a native track that plays. Each pair that
 * is over its bound is a `LIVE` row with its sample times, its two values, its gap, and its bound.
 *
 * The hand-over window of a track that the frame driver took is from the start call of the frame driver for
 * its key on the native box to one display frame after the end report of the track. Each request step in
 * it is a `LIVE` row with its sample times, the origin and the generation of the track, the playback keys,
 * the value that the native box shows, its model value, the value of the twin, the pair gap with its bound,
 * and the values that a read of the track can show at the step. The statement of such a row: the native
 * box shows a value of its track by the rule of statement A, or the pair is inside its bound. A row that
 * shows the model value plus the offset of the track is on neither and fails. The row prints the two
 * results apart. A row from that start call to the end report of the track has the mark `defect 12H`:
 * Objective 12H measured that the layer can show the model plus the offset of the track there. The mark is
 * a print, and the statement is the same for each row.
 *
 * The end callback of the native box comes from n + 1 display frames before the callback of a twin of n
 * phases to two display frames after it, on the UI runtime and on the React Native runtime: the sum of the
 * bound of an end report and of the start rule of the twin. A track that plays to its end reports the end
 * from one display frame before to two after its declared end. The first row of a replacement comes in its
 * first three display frames. The frame driver has its first frame two display frames or less after the
 * end report of a track that it took.
 *
 * This suite does not assert that the native box and a twin of several phases end in one display frame: a
 * native sequence that ends 16 to 33 ms before the frame-driven one passes. Each callback gap and each
 * phase start is a printed row.
 *
 * The twin has a frame in each display frame: no frame comes more than one display frame and a half after
 * the frame before it. This statement and the pair statement assert on each row in each condition: no row
 * is skipped.
 *
 * A late frame, a late test step, or a late callback fails a statement. The suite is not in the default
 * run. Each test prints each quantity as `LIVE | test | quantity | value` before it asserts it, so the log
 * of a run under a load is a record of the quantities.
 */
import {
  describe,
  expect,
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  HandOver,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  defectMarkOf,
  handOversOf,
  isReplaced,
  MATRIX_TOLERANCE,
  play,
  REFERENCE_CASES,
  targetsOf,
} from './nativeLayoutReferencePlay';
import type {
  Band,
  OperationValue,
  PlayedTrack,
  ScalarTrack,
  TargetSample,
  Timeline,
} from './nativeLayoutTestKit';
import {
  amountOf,
  callbackTimeOf,
  cellsOf,
  cellToleranceOf,
  checkedTracksOf,
  declaredBandOf,
  declaredDurationOf,
  declaredFrameChangeAt,
  declaredFrameChangesAt,
  declaredOf,
  declaredStartsOf,
  describeLeaf,
  FIRST_FRAMES_MS,
  FRAME_MS,
  hasNativeLayoutStarts,
  isSameLeaf,
  isScalarTrack,
  middleOf,
  nativeResidualOf,
  phaseStartsLateOf,
  shownTrackOf,
  shownTracksOf,
} from './nativeLayoutTestKit';

// A frame time is equal to the sum of a start and a duration but for the rounding of a number.
const ROUNDING_MS = 1e-6;

describe('native layout live clock', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, referenceCase] of Object.entries(REFERENCE_CASES)) {
    test(`${caseName}: the two boxes agree on the wall clock`, async () => {
      const played = await play(referenceCase);
      const expectIn = (
        quantity: string,
        value: number,
        { from, to }: Band
      ) => {
        console.log(`LIVE | ${caseName} | ${quantity} | ${value.toFixed(3)}`);
        expect(value >= from && value <= to).toBe(true);
      };
      const twinChecks = played.frameChecks.filter(
        ({ record }) => record.box === 'frame'
      );

      const handOvers = handOversOf(played);
      const pairRows = pairRowsOf(referenceCase, played, handOvers);
      for (const { describe } of pairRows.filter(
        ({ overBound }) => overBound > 0
      )) {
        console.log(`LIVE | ${caseName} | ${describe()}`);
      }
      for (const [name, distance] of largestOverBoundOf(pairRows)) {
        expectIn(
          `largest distance of the pair over its bound, ${name}`,
          distance,
          { from: -Infinity, to: 0 }
        );
      }
      for (const { text, isOnTrackOrInPair } of handOvers.flatMap((handOver) =>
        handOverRowsOf(handOver, played)
      )) {
        console.log(`LIVE | ${caseName} | ${text}`);
        expect(isOnTrackOrInPair).toBe(true);
      }
      expect(played.missingCallbacks).toBe('');
      const nativeCallback = callbackTimeOf('native');
      const twinCallback = callbackTimeOf('frame');
      const twinPhases = Math.max(
        ...twinChecks.map(({ timeline }) => timeline.phases.length)
      );
      const callbackGap = {
        from: -(twinPhases + 1) * FRAME_MS,
        to: 2 * FRAME_MS,
      };
      expectIn(
        'native end callback after the callback of the twin on the UI runtime, ms',
        nativeCallback.emittedMs - twinCallback.emittedMs,
        callbackGap
      );
      expectIn(
        'native end callback after the callback of the twin on the React Native runtime, ms',
        nativeCallback.receivedMs - twinCallback.receivedMs,
        callbackGap
      );
      for (const check of twinChecks) {
        const { record, timeline } = check;
        const leaf = describeLeaf(record);
        const frameTimes = record.frames.map(({ timeMs }) => timeMs);
        expectIn(
          `largest time from a frame of ${leaf} of the twin to the next, ms`,
          Math.max(
            ...frameTimes
              .slice(1)
              .map((timeMs, frame) => timeMs - frameTimes[frame])
          ),
          { from: -Infinity, to: 1.5 * FRAME_MS }
        );
        phaseStartsLateOf(check).forEach((lateMs, phase) =>
          expectIn(
            `computed start of phase ${phase} of ${leaf} of the twin after its declared start, ms`,
            lateMs,
            {
              from: startsWithNoDuration(timeline) ? -FRAME_MS : 0,
              to: phase * FRAME_MS + ROUNDING_MS,
            }
          )
        );
      }
      for (const [trackName, afterEndMs] of endReportsOf(played)) {
        expectIn(
          `end report of the track ${trackName} after its declared end, ms`,
          afterEndMs,
          { from: -FRAME_MS, to: 2 * FRAME_MS }
        );
      }
      for (const track of played.tracks) {
        const leaf = describeLeaf(track);
        if (track.replaced) {
          const firstReadMs = played.rows
            .map(({ row }) => row.native[track.target].monotonicTimeMs)
            .find((timeMs) => timeMs >= track.played.from);
          expectIn(
            `first row of the replacement of ${leaf} after its start, ms`,
            (firstReadMs ?? Infinity) - track.played.from,
            { from: 0, to: FIRST_FRAMES_MS }
          );
        }
        if (track.finished === false && !isReplaced(played, track)) {
          const clock = middleOf(played.clockOffset);
          const frames = played.frameChecks
            .filter(
              ({ record }) =>
                record.box === 'native' && isSameLeaf(record, track)
            )
            .flatMap(({ record }) => record.frames)
            .map(({ timeMs }) => timeMs + clock - track.played.to);
          expectIn(
            `first frame of the frame driver for ${leaf} after the end report of its track, ms`,
            Math.min(...frames.filter((afterMs) => afterMs > 0)),
            { from: 0, to: 2 * FRAME_MS }
          );
        }
      }
      await render(null);
    });
  }
});

const startsWithNoDuration = ({ phases: [first] }: Timeline) =>
  first.durationMs === 0;

const isIn = ({ from, to }: Band, timeMs: number) =>
  timeMs >= from && timeMs <= to;

const pairGapOf = (native: TargetSample, twin: TargetSample) =>
  Math.abs(native.presentation[0] - twin.model[0]);

/**
 * The tolerance of the key of a track plus the declared change of the key
 * around a time of the sample clock.
 */
function pairBoundOf(track: ScalarTrack, played: Played, timeMs: number) {
  const shown = shownTrackOf(track, played.tracks);
  return (
    track.tolerance +
    declaredFrameChangeAt(
      (stepTimeMs) => declaredOf(shown, stepTimeMs),
      timeMs,
      Math.max(1, startedPhasesOf(track, timeMs - middleOf(track.origin)))
    )
  );
}

/** One row for each request step in the hand-over window of a track. */
function handOverRowsOf(handOver: HandOver, played: Played) {
  const { track, startCallMs, window } = handOver;
  const { key, generation, origin, tolerance, target } = track;
  const shown = shownTrackOf(track, played.tracks);
  const originMs = middleOf(origin);
  return played.rows.flatMap(({ row }) => {
    const native = row.native[target];
    const twin = row.frame[target];
    const timeMs = native.monotonicTimeMs;
    if (!isIn(window, timeMs)) {
      return [];
    }
    const [value] = native.presentation;
    const band = declaredBandOf(shown, timeMs);
    const {
      distances: [distance],
      isOnTimeline,
    } = nativeResidualOf([value], timeMs, [shown]);
    const gap = pairGapOf(native, twin);
    const bound = pairBoundOf(track, played, timeMs);
    const isInPair = gap <= bound;
    return [
      {
        text: [
          `hand-over row of ${key} of the command ${generation}`,
          `native sample ${(timeMs - originMs).toFixed(2)} ms and twin sample ${(twin.monotonicTimeMs - originMs).toFixed(2)} ms after the origin ${originMs.toFixed(2)} ms`,
          `${(timeMs - startCallMs).toFixed(2)} ms after the start call of the frame driver and ${(timeMs - track.played.to).toFixed(2)} ms after the end report of the track`,
          `playback keys ${native.playbackKeys.join()}`,
          `native presentation ${value.toFixed(4)}`,
          `native model ${native.model[0].toFixed(4)}`,
          `twin model ${twin.model[0].toFixed(4)}`,
          `pair gap ${gap.toFixed(4)} with the bound ${bound.toFixed(4)}`,
          `values of the track ${band.from.toFixed(4)}..${band.to.toFixed(4)} with the tolerance ${tolerance}, distance ${distance.toFixed(4)}`,
          `${isOnTimeline ? 'on its track' : 'NOT on its track'}, ${isInPair ? 'in the pair bound' : 'NOT in the pair bound'}`,
          ...defectMarkOf([handOver], track, timeMs),
        ].join(' | '),
        isOnTrackOrInPair: isOnTimeline || isInPair,
      },
    ];
  });
}

/**
 * The pair of one scalar key, or of the `Transform` target, at one request
 * step.
 */
type PairRow = {
  name: string;
  /** The distance of the two boxes minus the bound of the pair at the step. */
  overBound: number;
  describe: () => string;
};

/**
 * The pair of each scalar key and of the `Transform` target in each row. The
 * rows of a hand-over window are not in it: `handOverRowsOf` has them.
 */
function pairRowsOf(
  referenceCase: ReferenceCase,
  played: Played,
  handOvers: HandOver[]
) {
  const twinWrites = new Map<number, TwinWrite[]>();
  return played.rows.flatMap(({ row }) =>
    targetsOf(referenceCase).flatMap((target): PairRow[] => {
      const native = row.native[target];
      const twin = row.frame[target];
      const timeMs = native.monotonicTimeMs;
      const tracks = checkedTracksOf(played.tracks, target, timeMs);
      const pairs = tracks
        .filter(isScalarTrack)
        .filter(
          (track) =>
            !handOvers.some(
              (handOver) =>
                handOver.track === track && isIn(handOver.window, timeMs)
            )
        )
        .map((track) => scalarPairOf(track, native, twin, played));
      if (tracks.some((track) => !isScalarTrack(track))) {
        const [{ generation }] = tracks;
        if (!twinWrites.has(generation)) {
          twinWrites.set(generation, twinWritesOf(played, tracks));
        }
        pairs.push(
          cellsPairOf(tracks, native, twin, twinWrites.get(generation)!, played)
        );
      }
      return pairs;
    })
  );
}

function largestOverBoundOf(pairRows: PairRow[]) {
  const largest = new Map<string, number>();
  for (const { name, overBound } of pairRows) {
    largest.set(name, Math.max(largest.get(name) ?? -Infinity, overBound));
  }
  return largest;
}

const describePairStep = (
  { generation, origin }: PlayedTrack,
  name: string,
  native: TargetSample,
  twin: TargetSample
) =>
  `pair row of ${name} of the command ${generation} over its bound | native sample ${(native.monotonicTimeMs - middleOf(origin)).toFixed(2)} ms and twin sample ${(twin.monotonicTimeMs - middleOf(origin)).toFixed(2)} ms after the origin`;

function scalarPairOf(
  track: ScalarTrack,
  native: TargetSample,
  twin: TargetSample,
  played: Played
): PairRow {
  const gap = pairGapOf(native, twin);
  const bound = pairBoundOf(track, played, native.monotonicTimeMs);
  return {
    name: track.key,
    overBound: gap - bound,
    describe: () =>
      [
        describePairStep(track, track.key, native, twin),
        `native presentation ${native.presentation[0].toFixed(4)}`,
        `twin model ${twin.model[0].toFixed(4)}`,
        `pair gap ${gap.toFixed(4)} with the bound ${bound.toFixed(4)}`,
      ].join(' | '),
  };
}

const startedPhasesOf = ({ timeline }: PlayedTrack, timeMs: number) =>
  declaredStartsOf(timeline).filter((startMs) => startMs <= timeMs).length;

/**
 * The operation values of one write of the twin, and the cells that its model
 * has with them.
 */
type TwinWrite = { values: OperationValue[]; cells: number[] };

/**
 * The writes of the twin for the operations of tracks: for each time at which
 * the frame driver started or stepped one of the operations, the last value of
 * each operation.
 */
function twinWritesOf(played: Played, operations: PlayedTrack[]): TwinWrite[] {
  const writes = operations.map((track) =>
    played.frameChecks
      .filter(
        ({ record }) => record.box === 'frame' && isSameLeaf(record, track)
      )
      .flatMap(({ record }) => [
        ...(record.start ? [record.start] : []),
        ...record.frames,
      ])
  );
  const times = [...new Set(writes.flat().map(({ timeMs }) => timeMs))];
  return times.flatMap((timeMs) => {
    const values = operations.flatMap(
      ({ key }, operation): OperationValue[] => {
        const written = writes[operation].filter(
          (write) => write.timeMs <= timeMs
        );
        return written.length === 0
          ? []
          : [{ kind: key, ...amountOf(written[written.length - 1].value) }];
      }
    );
    return values.length < operations.length
      ? []
      : [{ values, cells: cellsOf(values, 'rest') }];
  });
}

const toleranceOfCell = (cell: number) =>
  cellToleranceOf(cell, MATRIX_TOLERANCE);

/**
 * The pair of the `Transform` target: the cell that the native box shows
 * farthest over its bound from the cell of the write of the twin that the model
 * of the twin shows.
 */
function cellsPairOf(
  operations: PlayedTrack[],
  native: TargetSample,
  twin: TargetSample,
  twinWrites: TwinWrite[],
  played: Played
): PairRow {
  const distanceFromModel = ({ cells }: TwinWrite) =>
    Math.max(
      ...cells.map(
        (cell, index) =>
          Math.abs(cell - twin.model[index]) / toleranceOfCell(index)
      )
    );
  const fromModel = twinWrites.map(distanceFromModel);
  const nearest = Math.min(...fromModel);
  const shown = twinWrites[fromModel.indexOf(nearest)];
  if (!shown || nearest > 1) {
    throw new Error(
      `The model of the twin ${twin.model.join()} shows no write of its record.`
    );
  }
  const timeMs = native.monotonicTimeMs;
  const fromOriginMs = timeMs - middleOf(operations[0].origin);
  const cellTracks = shownTracksOf(operations, played.tracks, MATRIX_TOLERANCE);
  const changes = declaredFrameChangesAt(
    (stepTimeMs) => cellTracks.map((track) => declaredOf(track, stepTimeMs)),
    timeMs,
    Math.max(
      1,
      ...operations.map((track) => startedPhasesOf(track, fromOriginMs))
    )
  );
  const twinCells = cellsOf(shown.values, 'playing');
  const overBounds = twinCells.map(
    (cell, index) =>
      Math.abs(native.presentation[index] - cell) -
      toleranceOfCell(index) -
      changes[index]
  );
  const overBound = Math.max(...overBounds);
  const cell = overBounds.indexOf(overBound);
  return {
    name: 'Transform',
    overBound,
    describe: () =>
      [
        describePairStep(operations[0], 'Transform', native, twin),
        `cell ${cell}: native presentation ${native.presentation[cell].toFixed(4)}`,
        `write of the twin ${twinCells[cell].toFixed(4)}`,
        `pair gap ${Math.abs(native.presentation[cell] - twinCells[cell]).toFixed(4)} with the bound ${(toleranceOfCell(cell) + changes[cell]).toFixed(4)}`,
      ].join(' | '),
  };
}

/**
 * For each track that played to its end: how long after the declared end of its
 * longest key the trace has its end.
 */
function endReportsOf({ tracks }: Played) {
  const reports = new Map<string, number>();
  for (const { target, generation, played, origin, finished } of tracks) {
    if (finished) {
      const totals = tracks
        .filter(
          (track) => track.target === target && track.generation === generation
        )
        .map(({ timeline }) => declaredDurationOf(timeline));
      reports.set(
        `${target} ${generation}`,
        played.to - middleOf(origin) - Math.max(...totals)
      );
    }
  }
  return reports;
}
