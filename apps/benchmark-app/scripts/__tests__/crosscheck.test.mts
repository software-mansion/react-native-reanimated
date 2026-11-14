import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compareEpochs,
  compareFootprints,
  crosscheckVerdict,
  mapAppClock,
  rederivedEpoch,
  rederivedFootprint,
  traceSpans,
} from '../crosscheck.mts';
import type { ClockMapping } from '../crosscheck.mts';
import { readEpoch } from '../in-app-sample.mts';
import type { SampledEpoch } from '../in-app-sample.mts';
import type { TraceEpoch } from '../xctrace-metrics.mts';
import { END_BOUNDARY, START_BOUNDARY, inAppSample } from './ios-fixtures.mts';

const SAMPLE = inAppSample();
const EPOCHS: SampledEpoch[] = SAMPLE.epochs;
const READING = readEpoch(SAMPLE, 0, 60);
const CLOCK: ClockMapping = { offsetNs: 1000, uncertaintyNs: 0, spreadNs: 0 };
const TRACE_OF_APP: TraceEpoch = {
  uiThreadCpu: 350,
  jsThreadCpu: 2,
  processCpu: 353,
  frameDurationsMs: Array.from({ length: 600 }, () => 6),
  mountBatchCount: 600,
};

function assertCloseTo(actual: number | null, expected: number) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) < 1e-9,
    `${actual} is not ${expected}`
  );
}

function loadEpoch(load: string, own: number, other: number): SampledEpoch {
  return { load, collector: 'full', seconds: 10, work: { own, other } };
}

describe('mapAppClock', () => {
  it('gives the median offset of the Boundary signposts from the middle of their emission, and its uncertainty', () => {
    assert.deepEqual(mapAppClock(SAMPLE, [5_025_000, 10_005_025_500]), {
      offsetNs: 5_000_500,
      uncertaintyNs: 3_500,
      spreadNs: 500,
    });
  });

  it('stops when the clocks differ by more than 1 ms or a boundary has no signpost', () => {
    assert.throws(
      () => mapAppClock(SAMPLE, [5_025_000, 10_006_025_001]),
      /differ by 1000001 ns between the Boundary signposts, more than 1000000 ns/
    );
    assert.throws(
      () => mapAppClock(SAMPLE, [5_025_000]),
      /The trace has 1 Boundary signposts of the app, and its SAMPLE line has 2 boundaries/
    );
  });
});

describe('traceSpans', () => {
  it('moves the window and the read of each counter to the clock of the trace', () => {
    assert.deepEqual(traceSpans([READING], CLOCK), [
      {
        window: { startNs: 11_000, endNs: 10_000_011_000 },
        counters: {
          uiThread: { startNs: 3_500, endNs: 10_000_003_500 },
          jsThread: { startNs: 8_500, endNs: 10_000_008_500 },
          process: { startNs: 16_000, endNs: 10_000_016_000 },
        },
      },
    ]);
  });
});

describe('compareEpochs', () => {
  it('gives the signed, absolute and relative error, the timing uncertainty and the gate of each value', () => {
    const [epoch] = compareEpochs(
      EPOCHS,
      [READING],
      [
        {
          ...TRACE_OF_APP,
          uiThreadCpu: 344,
          jsThreadCpu: 3.5,
          processCpu: 365,
        },
      ],
      { offsetNs: 0, uncertaintyNs: 50_000, spreadNs: 0 },
      60
    );
    const uncertainty = READING.cpuUncertainty.uiThread + 100_000 / 1e6 / 10;
    assert.deepEqual(epoch.uiThreadCpu, {
      app: 350,
      trace: 344,
      signedError: 6,
      absoluteError: 6,
      relativeError: 6 / 344,
      timingUncertainty: uncertainty,
      tolerance: 0.02 * 344 + uncertainty,
      passes: true,
    });
    assert.equal(epoch.jsThreadCpu.passes, false);
    assert.equal(epoch.processCpu.passes, false);
    assertCloseTo(
      epoch.processCpu.timingUncertainty,
      READING.cpuUncertainty.process + (100_000 * 6) / 1e6 / 10
    );
    assert.equal(epoch.mountBatchCount.passes, true);
    assert.equal(epoch.mountBatchCount.timingUncertainty, null);
    assert.deepEqual(epoch.updateCount, { app: 600, trace: 600 });
    assert.equal(epoch.uiUpdateDurationMedian?.passes, true);
    assert.equal(epoch.uiUpdateDurationP95?.tolerance, 0.05 * 6);
  });

  it('passes a CPU error that is inside the tolerance only because of the timing uncertainty', () => {
    const compare = (uncertaintyNs: number) =>
      compareEpochs(
        EPOCHS,
        [READING],
        [{ ...TRACE_OF_APP, jsThreadCpu: 3.05 }],
        { offsetNs: 0, uncertaintyNs, spreadNs: 0 },
        60
      )[0].jsThreadCpu.passes;
    assert.equal(compare(0), false);
    assert.equal(compare(250_000), true);
  });

  it('needs the exact mount count and trace frames for the quantiles', () => {
    const [epoch] = compareEpochs(
      EPOCHS,
      [READING],
      [{ ...TRACE_OF_APP, mountBatchCount: 599, frameDurationsMs: [] }],
      CLOCK,
      60
    );
    assert.equal(epoch.mountBatchCount.passes, false);
    assert.equal(epoch.uiUpdateDurationMedian?.trace, null);
    assert.equal(epoch.uiUpdateDurationMedian?.passes, false);
  });

  it('has no UI update values for an epoch with only the counter reads', () => {
    const sample = inAppSample({
      epochs: [{ ...loadEpoch('none', 0, 0), collector: 'endpoints' }],
      boundaries: [START_BOUNDARY, { ...END_BOUNDARY, updates: 0 }],
      updates: { beginNs: [], endNs: [], modelTimeNs: [] },
    });
    const [epoch] = compareEpochs(
      sample.epochs,
      [readEpoch(sample, 0, 60)],
      [TRACE_OF_APP],
      CLOCK,
      60
    );
    assert.equal(epoch.uiUpdateDurationMedian, null);
    assert.deepEqual(epoch.updateCount, { app: null, trace: 600 });
  });

  it('proves a load with its own work units in half of the display refreshes and few units of other loads', () => {
    const proof = (epoch: SampledEpoch) =>
      compareEpochs([epoch], [READING], [TRACE_OF_APP], CLOCK, 60)[0].workProof;
    assert.deepEqual(proof(loadEpoch('js-load', 300, 60)), {
      own: 300,
      other: 60,
      minimumOwn: 300,
      maximumOther: 60,
      passes: true,
    });
    assert.equal(proof(loadEpoch('ui-stall', 299, 0)).passes, false);
    assert.equal(proof(loadEpoch('render-heavy', 600, 61)).passes, false);
    assert.equal(proof(loadEpoch('idle', 0, 0)).minimumOwn, 0);
    assert.equal(proof(loadEpoch('idle', 0, 61)).passes, false);
  });
});

describe('compareFootprints', () => {
  const READ_CLOCK: ClockMapping = {
    offsetNs: 1_000_000,
    uncertaintyNs: 500,
    spreadNs: 0,
  };
  const row = (startNs: number, footprintKb: number, durationNs = 1_000) => ({
    startNs,
    endNs: startNs + durationNs,
    footprintKb,
  });
  const END_ROWS = [row(9_500_000_000, 40_200), row(10_500_000_000, 40_400)];

  it('compares the footprint of the app with the range of the Activity Monitor rows around its read', () => {
    const rows = [row(0, 39_500), row(1_500_000, 40_100), ...END_ROWS];
    const [first, second] = compareFootprints(SAMPLE, rows, READ_CLOCK);
    assert.deepEqual(first, {
      boundary: 0,
      app: 40_000,
      read: { startNs: 1_019_500, endNs: 1_021_500 },
      rows: rows.slice(0, 2),
      low: 39_500,
      high: 40_100,
      signedError: 0,
      tolerance: 1024,
      comparable: true,
      reason: null,
      passes: true,
    });
    assert.equal(second.comparable, true);
    assert.deepEqual(second.rows, END_ROWS);
    assert.equal(second.passes, true);
  });

  it('includes a row that overlaps the read in the range, and fails an app value too far from the range', () => {
    const [first] = compareFootprints(
      SAMPLE,
      [
        row(0, 41_200),
        row(1_019_000, 41_600, 2_000),
        row(1_500_000, 41_300),
        ...END_ROWS,
      ],
      READ_CLOCK
    );
    assert.equal(first.rows.length, 3);
    assert.equal(first.high, 41_600);
    assert.equal(first.signedError, -1_200);
    assert.equal(first.passes, false);
  });

  it('does not compare a read without a row on each side, with rows that cover more than 2 s, or with rows that differ by the tolerance', () => {
    const reasonOf = (rows: ReturnType<typeof row>[]) =>
      compareFootprints(SAMPLE, rows, READ_CLOCK)[0].reason;
    assert.equal(
      reasonOf([row(0, 40_000)]),
      'Activity Monitor has no row that ends before the read or no row that starts after it'
    );
    assert.equal(
      reasonOf([row(1_019_000, 40_000), row(1_500_000, 40_000)]),
      'Activity Monitor has no row that ends before the read or no row that starts after it'
    );
    assert.equal(
      reasonOf([row(0, 40_000), row(2_000_000_000, 40_000)]),
      'the Activity Monitor rows around the read cover 2000.001 ms, more than 2000 ms'
    );
    assert.equal(
      reasonOf([row(0, 39_000), row(1_500_000, 40_024)]),
      'the Activity Monitor rows around the read differ by 1024 kB, not less than the tolerance of 1024 kB'
    );
  });
});

describe('the footprint rows around a read', () => {
  const at = (seconds: number) => Math.round(seconds * 1e9);
  const halfSecondRows = (values: number[]) =>
    values.map((footprintKb, i) => ({
      startNs: at(i * 0.5),
      endNs: at((i + 1) * 0.5),
      footprintKb,
    }));

  it('takes only the rows from the last row that ends before the read to the first row that starts after it', () => {
    const rows = halfSecondRows([100_000, 40_000, 40_000, 40_000, 100_000]);
    const [first] = compareFootprints(SAMPLE, rows, {
      offsetNs: at(1.2) - START_BOUNDARY.footprintReadStartNs,
      uncertaintyNs: 0,
      spreadNs: 0,
    });
    assert.deepEqual(first.read, { startNs: at(1.2), endNs: at(1.2) + 1_000 });
    assert.deepEqual(first.rows, rows.slice(1, 4));
    assert.equal(first.comparable, true);
    assert.equal(first.passes, true);
  });

  it('counts a row that ends at the read start or starts at the read end, and leaves out the rows that only touch them', () => {
    const outerBefore = {
      startNs: 900_000,
      endNs: 1_000_000,
      footprintKb: 99_000,
    };
    const before = {
      startNs: 1_000_000,
      endNs: 1_019_500,
      footprintKb: 40_000,
    };
    const after = { startNs: 1_021_500, endNs: 1_030_000, footprintKb: 40_100 };
    const outerAfter = {
      startNs: 1_030_000,
      endNs: 1_040_000,
      footprintKb: 99_000,
    };
    const [first] = compareFootprints(
      SAMPLE,
      [outerBefore, before, after, outerAfter],
      { offsetNs: 1_000_000, uncertaintyNs: 500, spreadNs: 0 }
    );
    assert.deepEqual(first.rows, [before, after]);
    assert.equal(first.comparable, true);
    assert.equal(first.passes, true);
  });

  it('measures the span of the rows to the latest end, also when a row overlaps the read', () => {
    const rows = [
      { startNs: 0, endNs: at(0.5), footprintKb: 40_000 },
      { startNs: at(0.5), endNs: at(10), footprintKb: 40_000 },
      { startNs: at(1.5), endNs: at(2), footprintKb: 40_000 },
    ];
    const [first] = compareFootprints(
      inAppSample({
        boundaries: [
          {
            ...START_BOUNDARY,
            footprintReadStartNs: at(1),
            footprintReadEndNs: at(1.1),
            signpostStartNs: at(1.1),
            signpostEndNs: at(1.1),
          },
          END_BOUNDARY,
        ],
      }),
      rows,
      { offsetNs: 0, uncertaintyNs: 0, spreadNs: 0 }
    );
    assert.deepEqual(first.rows, rows);
    assert.equal(first.comparable, false);
    assert.equal(
      first.reason,
      'the Activity Monitor rows around the read cover 10000 ms, more than 2000 ms'
    );
  });

  it('gives the same comparison again from its read and its rows, and refuses rows that are not the rows around the read', () => {
    const rows = halfSecondRows([40_000, 40_000, 40_000]);
    const [first] = compareFootprints(SAMPLE, rows, {
      offsetNs: at(0.7) - START_BOUNDARY.footprintReadStartNs,
      uncertaintyNs: 0,
      spreadNs: 0,
    });
    assert.deepEqual(rederivedFootprint(first), first);
    const forged = rederivedFootprint({
      ...first,
      rows: [rows[0], rows[0], rows[2]],
    });
    assert.equal(forged.comparable, false);
    assert.equal(
      forged.reason,
      'the rows are not the rows from the last row that ends before the read to the first row that starts after it'
    );
  });
});

describe('rederivedEpoch', () => {
  it('gives each stored outcome of an epoch again from its values', () => {
    const [epoch] = compareEpochs(
      EPOCHS,
      [READING],
      [{ ...TRACE_OF_APP, uiThreadCpu: 300 }],
      { offsetNs: 0, uncertaintyNs: 50_000, spreadNs: 0 },
      60
    );
    assert.deepEqual(rederivedEpoch(epoch, 60), epoch);
    const forged = {
      ...epoch,
      uiThreadCpu: { ...epoch.uiThreadCpu, passes: true },
      workProof: { ...epoch.workProof, passes: false },
    };
    assert.deepEqual(rederivedEpoch(forged, 60), epoch);
  });
});

describe('crosscheckVerdict', () => {
  it('passes the counters, the loads and the memory, and says if the update quantiles are within tolerance', () => {
    const footprints = compareFootprints(
      SAMPLE,
      [
        { startNs: 0, endNs: 1_000, footprintKb: 40_000 },
        { startNs: 1_000_000, endNs: 1_001_000, footprintKb: 40_000 },
        { startNs: 9_500_000_000, endNs: 9_500_001_000, footprintKb: 40_300 },
        {
          startNs: 10_500_000_000,
          endNs: 10_500_001_000,
          footprintKb: 40_300,
        },
      ],
      { offsetNs: 0, uncertaintyNs: 0, spreadNs: 0 }
    );
    const epochs = compareEpochs(EPOCHS, [READING], [TRACE_OF_APP], CLOCK, 60);
    assert.deepEqual(crosscheckVerdict(epochs, footprints), {
      counters: true,
      loadsRan: true,
      memory: 'passed',
      updateDurationQuantilesWithinTolerance: true,
    });
    assert.equal(
      crosscheckVerdict(epochs, [
        footprints[0],
        { ...footprints[1], passes: false },
      ]).memory,
      'failed'
    );
    assert.deepEqual(
      crosscheckVerdict(
        compareEpochs(
          EPOCHS,
          [READING],
          [{ ...TRACE_OF_APP, frameDurationsMs: [7] }],
          CLOCK,
          60
        ),
        [footprints[0]]
      ),
      {
        counters: true,
        loadsRan: true,
        memory: 'not available',
        updateDurationQuantilesWithinTolerance: false,
      }
    );
  });
});
