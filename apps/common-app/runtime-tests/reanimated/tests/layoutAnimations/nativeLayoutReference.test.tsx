/*
 * The reference of the native layout suites is the declared timeline: the value of a leaf as a function of
 * the time from the start of its animation, from the declaration of the test. Each box is on its own clock.
 *
 * A: each sample of the native box shows the declared values of one time, from one display frame before the
 * sample to the sample, on the clock of the origin of its command (a presentation value is of the first
 * read of its display frame). The check takes the times of that display frame 0.26 ms apart and the two
 * sides of each phase edge: a read whose values fit only a time between two of them fails. A sample of the
 * `Transform` target is the 16 cells of its matrix against the matrix of the declared values of its
 * operations at one time, in the product order of a track that plays. The tolerance of a cell, 0.005, has
 * no derivation. A sample of a position target is the center of the box: the declared origin plus half of
 * the declared size of the same time, which is the size track of the command or the size at rest.
 *
 * A track that replaces a track: before the `TrackStarted` time of the new track its key has the declared
 * value of the replaced track, as if it played on; from that time it has the new track, on the clock of the
 * origin of its command. The check takes the track of the key at each time of the display frame before the
 * sample, with no other allowance: a read on neither track fails. Each read whose display frame has that
 * `TrackStarted` time is a `GATE` row with the time and the track that the check found. A track that
 * replaces a track on screen starts at the value that the route captured from the replaced track for its
 * build, and each captured value is on the timeline of its own track at its time: a `CAPTURE` row has the
 * time of the capture from the origin of the new track. An operation of a transform starts at the initial
 * value of its builder. A read that shows the replaced track after the origin of the new track is a property
 * of the read and not of the screen. Measured by the hand-over measurement of Objective 12H: 62 of 62 reads
 * after a flush of the transaction were on the new track, plain reads showed the replaced track for 11.90
 * to 13.99 ms, and no recorded display frame was wrong in 10 of 10 replacements.
 *
 * B: each frame of the frame-driven twin wrote the value that a replay of the declared timeline has at the
 * frame time, after the start call of the record. The replay (`replayFrames`) is a copy of the start rules
 * of the frame driver as the kit writes them: a timing moves its start to a frame before it (`timing` of
 * `withTiming`), a delay starts its animation in the first frame at or after its end (`delay` of
 * `withDelay`), a sequence starts its next animation in the frame in which the current one ends (`sequence`
 * of `withSequence`), a timing that replaces a timing with its end value adopts the start of that timing
 * with its own duration and easing (`onStart` of `withTiming`), and a delay runs the animation that its
 * animation replaced (`delay` of `withDelay`). B checks recorded root values against this replay. It does
 * not read child phase starts or prove that these rules are correct: a defect that is in the frame driver
 * and in the copy passes, and a phase that holds one value hides a change of its start. A change of a rule
 * that moves a frame value fails B. So B does not prove that a phase of the twin starts at its declared
 * time: the suite `native layout live clock` bounds that. Each phase start that this suite prints is a
 * computed start of the replay.
 *
 * A does not check a read in the first 18 ms after `TrackStarted` of a track that replaces no track, of a
 * key that starts at a value that its view did not show before its command: a view that mounts with the
 * command, or a key with an initial value. Measured in 19 runs with no load, with a busy main thread, and
 * with a busy JS thread: such a read showed the value before the command, the model value of a new view or
 * the value of the style, up to 13.88 ms after `TrackStarted`, and the first read on the timeline came 0.48
 * to 14.30 ms after it. The 18 ms are one display frame and 1.33 ms: a choice from these data, not a bound
 * for each machine. A read off the timeline after them fails. Each run prints the reads of each such start
 * as one `GATE` row. The screen does not show the value before the command, measured by the hand-over
 * measurement of Objective 12H on recorded display frames: no flash for a view that enters (50 of 50 starts,
 * and 3 of 3 with a block of the main thread of 600 ms) and none for a layout animation with an initial
 * offset (50 of 50, and 3 of 3). A view with an initial transform: not tested. Another track has no gate.
 *
 * Each checked read that is off the timeline is an `OFF` row with the state of its view. The row has the
 * mark `defect 12H` when the read is in the hand-over window of its track: from the start call of the frame
 * driver for the key to the end report of the track. Objective 12H measured that the layer can show the
 * model plus the offset of the track there. The mark is a print: statement A is the same for each read.
 *
 * No statement here compares the two boxes at one instant. So this suite does not prove: the distance of
 * the two boxes on the wall clock, the lag of the frame driver, when a callback comes, the pixels on
 * screen, the order in which the screen shows the operations of a transform, the edge antialiasing. The
 * suite `native layout live clock` has the wall-clock statements of the same cases.
 */
import React from 'react';

import {
  describe,
  expect,
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  LeafCheck,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  defectMarkOf,
  endOperationsOf,
  expectedCallbacksOf,
  handOversOf,
  MATRIX_TOLERANCE,
  play,
  REFERENCE_CASES,
} from './nativeLayoutReferencePlay';
import type {
  FrameResidual,
  NativeRead,
  PlayedTrack,
  TargetSample,
} from './nativeLayoutTestKit';
import {
  amountOf,
  builderCalls,
  callbacks,
  cellToleranceOf,
  declaredOf,
  describeLeaf,
  END_LEFT,
  endCellsOf,
  expectCapturedStart,
  expectFrameTimeline,
  expectNativeReads,
  hasNativeLayoutStarts,
  layoutOf,
  middleOf,
  nativeResidualOf,
  ownerAt,
  renderBox,
  Scene,
  shownAtRestOf,
  START_LEFT,
  takeTraceUntil,
  waitForBuilderCalls,
  waitForCallbacks,
} from './nativeLayoutTestKit';

describe('native layout reference', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, referenceCase] of Object.entries(REFERENCE_CASES)) {
    test(`${caseName}: the native samples and the frames of the twin are on the declared timeline`, async () => {
      const played = await play(referenceCase);
      const reads = expectNativeRows(played);
      expect(reads.some(({ isChecked }) => isChecked)).toBe(
        !referenceCase.isFrameDriven
      );
      const residuals = [
        ...describeNativeReads(reads, played),
        ...expectFrameRecords(played),
        `captured values ${played.captures.length}`,
      ];
      played.captures.forEach(expectCapturedStart);
      expectEnd(referenceCase, played);
      console.log(['REFERENCE', caseName, ...residuals].join(' | '));
      for (const capture of describeCapturedStarts(played.tracks)) {
        console.log(['CAPTURE', caseName, capture].join(' | '));
      }
      for (const gate of [
        ...describeGates(reads),
        ...describeReplacementReads(reads),
      ]) {
        console.log(['GATE', caseName, gate].join(' | '));
      }
      for (const read of describeReadsOffTimeline(reads, played)) {
        console.log(['OFF', caseName, read].join(' | '));
      }
      await render(null);
    });
  }

  test('three starts: the test waits for the builder call and for the native start of each, and the callbacks are false, false, and true', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'chain' });
    const tag = await renderBox({ layout });
    let starts = 0;
    for (const left of [END_LEFT, 2 * END_LEFT, START_LEFT]) {
      await render(<Scene left={left} layout={layout} />);
      starts++;
      expect(await waitForBuilderCalls(starts)).toBe('');
      const events = await takeTraceUntil((taken) =>
        taken.some(isAdmittedOf(tag))
      );
      expect(events.filter(isAdmittedOf(tag)).length).toBe(1);
    }
    const expected = ['chain:false', 'chain:false', 'chain:true'];
    expect(await waitForCallbacks(expected)).toBe('');
    expect(callbacks.join()).toBe(expected.join());
    expect(builderCalls).toBe(starts);
    await render(null);
  });
});

const isAdmittedOf =
  (viewTag: number) =>
  ({ event, tag }: { event: string; tag: number }) =>
    event === 'Admitted' && tag === viewTag;

type RowRead = NativeRead & {
  spacingMs?: number;
  /** The sample of the read. */
  sampled: TargetSample;
};

const expectNativeRows = ({ rows, tracks }: Played): RowRead[] =>
  rows.flatMap(({ row, spacingMs }) =>
    expectNativeReads(row.native, tracks, MATRIX_TOLERANCE).map((read) => ({
      ...read,
      spacingMs,
      sampled: row.native[read.target],
    }))
  );

/**
 * Each checked read that is off the timeline, with the state of its view: the
 * record of a failed statement A.
 */
function describeReadsOffTimeline(reads: RowRead[], played: Played) {
  const { frameChecks, clockOffset } = played;
  const handOvers = handOversOf(played);
  const frameDriverStarts = frameChecks
    .filter(({ record }) => record.box === 'native')
    .flatMap(({ record }) => (record.start ? [record.start.timeMs] : []));
  return reads
    .filter(({ isChecked, residual }) => isChecked && !residual.isOnTimeline)
    .map(({ target, tracks: [track], timeMs, sampled }) => {
      const { presentation, model, playbackKeys } = sampled;
      return [
        `${target} of the command ${track.generation}: ${(timeMs - middleOf(track.origin)).toFixed(2)} ms after its origin`,
        `${(timeMs - track.played.from).toFixed(2)} ms after the start of its track`,
        `${(track.played.to - timeMs).toFixed(2)} ms before the end report of its track`,
        `presentation ${presentation.join()}`,
        `model ${model.join()}`,
        `playback keys ${playbackKeys.join()}`,
        `start calls of the frame driver for the box, ms after the read: ${frameDriverStarts.map((startMs) => (startMs + middleOf(clockOffset) - timeMs).toFixed(2)).join()}`,
        ...defectMarkOf(handOvers, track, timeMs),
      ].join(', ');
    });
}

function describeNativeReads(reads: RowRead[], { clockOffset }: Played) {
  const checked = reads.filter(({ isChecked }) => isChecked);
  const distances = checked.flatMap(({ residual, checked: tracks }) =>
    residual.distances.map(
      (distance, track) => distance / tracks[track].tolerance
    )
  );
  return [
    `native reads ${checked.length}`,
    `largest distance from the band ${largestOf(distances).toFixed(3)} of the tolerance`,
    `largest age ${largestOf(checked.map(({ residual }) => residual.ageMs)).toFixed(2)} ms`,
    `clock offset band ${(clockOffset.to - clockOffset.from).toFixed(3)} ms`,
    describeNewValueReads(checked),
  ];
}

/**
 * The reads that show a value for the first time have the value of their own
 * time: their distance from the declared value of that time, with no band.
 */
function describeNewValueReads(reads: RowRead[]) {
  const fresh = reads.filter(({ spacingMs }) => spacingMs !== undefined);
  const distances = fresh.flatMap(({ checked, values, timeMs }) =>
    checked.map(
      (track, index) =>
        Math.abs(values[index] - declaredOf(track, timeMs)) / track.tolerance
    )
  );
  return `reads of a new value ${fresh.length}, largest spacing ${largestOf(fresh.map(({ spacingMs }) => spacingMs!)).toFixed(2)} ms, largest distance from the value of their time ${largestOf(distances).toFixed(3)} of the tolerance`;
}

/**
 * For each start of tracks with a gate: when the reads of its target came on
 * the timeline, from the start of the tracks in the trace.
 */
function describeGates(reads: RowRead[]) {
  const gated = reads.filter(({ tracks }) =>
    tracks.some(({ checkedFromMs }) => checkedFromMs > -Infinity)
  );
  const startOf = ({ target, tracks: [{ generation }] }: RowRead) =>
    `${target} of the command ${generation}`;
  return [...new Set(gated.map(startOf))].map((start) => {
    const afterStart = gated
      .filter((read) => startOf(read) === start)
      .map(({ tracks: [track], timeMs, residual, isChecked }) => ({
        ms: timeMs - track.played.from,
        isOnTimeline: residual.isOnTimeline,
        isChecked,
      }));
    const off = afterStart.filter(({ isOnTimeline }) => !isOnTimeline);
    const firstOn = afterStart.find(({ isOnTimeline }) => isOnTimeline);
    return [
      `${start}: reads in the gate ${afterStart.filter(({ isChecked }) => !isChecked).length}`,
      `reads off the timeline ${off.length}`,
      `latest read off the timeline ${off.length === 0 ? 'none' : `${largestOf(off.map(({ ms }) => ms)).toFixed(2)} ms`}`,
      `first read on the timeline ${firstOn ? `${firstOn.ms.toFixed(2)} ms` : 'none'}`,
      `first read ${afterStart[0].ms.toFixed(2)} ms`,
    ].join(', ');
  });
}

/**
 * Each read whose display frame has the start of a track that replaced a track:
 * the time and the track of the declared values that are nearest to it.
 */
const describeReplacementReads = (reads: RowRead[]) =>
  reads
    .filter(({ residual }) => residual.crossesReplacement)
    .map(({ target, tracks: [track], timeMs, values, residual }) => {
      const foundMs = timeMs - residual.ageMs;
      const owner = ownerAt(track, foundMs);
      return [
        `${target} of the command ${track.generation} that replaced the command ${track.replaced?.generation}: read ${(timeMs - track.played.from).toFixed(2)} ms after the start of its track and ${(timeMs - middleOf(track.origin)).toFixed(2)} ms after its origin`,
        `values ${values.map((value) => value.toFixed(4)).join()}`,
        `nearest declared values: the command ${owner.generation} at ${(foundMs - track.played.from).toFixed(2)} ms after that start, ${residual.ageMs.toFixed(2)} ms before the read`,
        `distances ${residual.distances.map((distance) => distance.toFixed(4)).join()}`,
        residual.isOnTimeline ? 'on the timeline' : 'on NEITHER track',
      ].join(', ');
    });

/**
 * For each track that starts at a captured value: the value, and the time of
 * the capture from the origin and from the start of the track.
 */
const describeCapturedStarts = (tracks: PlayedTrack[]) =>
  tracks.flatMap(({ captured, key, generation, origin, played }) => {
    if (!captured) {
      return [];
    }
    const { value, timeMs, track } = captured;
    const {
      distances: [distance],
      ageMs,
    } = nativeResidualOf([value], timeMs, [track]);
    return [
      `${key} of the command ${generation} starts at ${value.toFixed(4)}, captured ${(timeMs - middleOf(origin)).toFixed(3)} ms after its origin and ${(played.from - timeMs).toFixed(3)} ms before the start of its track, ${distance.toFixed(4)} from the replaced track at ${ageMs.toFixed(2)} ms before the capture`,
    ];
  });

// The frame driver and the timeline have the value of one function of one time.
const FRAME_TOLERANCE = 1e-6;

/**
 * Statement B, for the twin and for the frames that the frame driver gave to
 * the native box. A timing that adopts a start has the start time and the start
 * value of the timing that it replaced. A leaf that starts on screen after a
 * leaf starts at the last value that the replaced leaf wrote before the start
 * call.
 */
function expectFrameRecords({ frameChecks }: Played) {
  const residuals = new Map<LeafCheck, FrameResidual>();
  for (const check of frameChecks) {
    const { record, declared, replaced } = check;
    if (record.adoptedStart && replaced) {
      expect(amountOf(record.adoptedStart.value).amount).toBe(
        replaced.timeline.from
      );
      expect(record.adoptedStart.timeMs).toBe(residuals.get(replaced)?.startMs);
    } else if (replaced && declared.startsOnScreen) {
      expect(record.start?.value).toBe(
        replaced.record.frames[(record.start?.replacedFrames ?? 0) - 1]?.value
      );
    }
    residuals.set(check, expectFrameTimeline(check, FRAME_TOLERANCE));
  }
  expect(frameChecks.some(({ record }) => record.box === 'frame')).toBe(true);
  const all = [...residuals.values()];
  return [
    `frames ${frameChecks.map(({ record }) => `${record.box} ${describeLeaf(record)} ${record.frames.length}`).join()}`,
    `largest frame distance ${largestOf(all.map(({ distance }) => distance)).toExponential(1)}`,
    `latest computed phase start ${largestOf(all.flatMap(({ startsLateMs }) => startsLateMs)).toFixed(2)} ms after its declared start`,
  ];
}

/**
 * Each animation gave its callbacks, and each box that is mounted ends at the
 * end value of each key, with no playback.
 */
function expectEnd(
  referenceCase: ReferenceCase,
  { end, endKeys, missingCallbacks }: Played
) {
  expect(missingCallbacks).toBe('');
  expect([...callbacks].sort().join()).toBe(
    expectedCallbacksOf(referenceCase).sort().join()
  );
  if (!end) {
    return;
  }
  for (const key of endKeys) {
    expect(end.native[key.target].playbackKeys.length).toBe(0);
    if (key.operation === undefined) {
      const atRest = shownAtRestOf(key, amountOf(key.to).amount);
      for (const [shown] of [
        end.native[key.target].presentation,
        end.frame[key.target].model,
      ]) {
        expect(Math.abs(shown - atRest) <= key.tolerance).toBe(true);
      }
    }
  }
  const operations = endOperationsOf(referenceCase);
  if (operations) {
    const cells = endCellsOf(operations);
    for (const shown of [
      end.native.Transform.presentation,
      end.frame.Transform.model,
    ]) {
      const distances = cells.map(
        (cell, index) =>
          Math.abs(shown[index] - cell) /
          cellToleranceOf(index, MATRIX_TOLERANCE)
      );
      expect(largestOf(distances) <= 1).toBe(true);
    }
  }
}

const largestOf = (values: number[]) => Math.max(0, ...values);
