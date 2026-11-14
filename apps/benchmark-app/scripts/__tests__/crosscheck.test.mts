import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compareEpochs,
  compareFootprints,
  crosscheckVerdict,
  mapAppClock,
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
  it('compares the footprint of the app at each read with Activity Monitor at the same time', () => {
    const values = compareFootprints(
      SAMPLE,
      [
        { timeNs: 0, footprintKb: 39_000 },
        { timeNs: 2_000_000_000, footprintKb: 41_000 },
        { timeNs: 9_000_000_000, footprintKb: 40_000 },
        { timeNs: 10_500_000_000, footprintKb: 40_100 },
      ],
      { offsetNs: 980_000, uncertaintyNs: 0, spreadNs: 0 }
    );
    assert.equal(values[0].trace, 39_000 + (1_000_000 / 2e9) * 2_000);
    assert.equal(values[0].passes, true);
    assert.ok(
      values[1].trace !== null &&
        Math.abs(values[1].trace - (40_000 + (1_001_000_000 / 1.5e9) * 100)) <
          1e-6
    );
    assert.equal(values[1].tolerance, 1024);
  });

  it('has no Activity Monitor value for a read without samples within 2 s on both sides', () => {
    const values = compareFootprints(
      SAMPLE,
      [{ timeNs: 10_500_000_000, footprintKb: 40_100 }],
      CLOCK
    );
    assert.deepEqual(
      values.map((value) => value.trace),
      [null, null]
    );
  });
});

describe('crosscheckVerdict', () => {
  it('passes the counters, the loads and the memory, and says if the update quantiles are within tolerance', () => {
    const footprints = compareFootprints(
      SAMPLE,
      [
        { timeNs: 0, footprintKb: 40_000 },
        { timeNs: 1_000_000_000, footprintKb: 40_000 },
        { timeNs: 9_500_000_000, footprintKb: 40_300 },
        { timeNs: 10_500_000_000, footprintKb: 40_300 },
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
    assert.deepEqual(
      crosscheckVerdict(
        compareEpochs(
          EPOCHS,
          [READING],
          [{ ...TRACE_OF_APP, frameDurationsMs: [7] }],
          CLOCK,
          60
        ),
        []
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
