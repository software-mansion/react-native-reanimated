import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compareEpochs,
  crosscheckVerdict,
  mapAppClock,
  traceSpans,
} from '../crosscheck.mts';
import { readEpoch } from '../in-app-sample.mts';
import type { SampleEpoch } from '../in-app-sample.mts';
import type { TraceEpoch } from '../xctrace-metrics.mts';
import { END_BOUNDARY, inAppSample } from './ios-fixtures.mts';

const SAMPLE = inAppSample();
const EPOCHS: SampleEpoch[] = SAMPLE.epochs;
const READING = readEpoch(SAMPLE, 0, 60);
const TRACE_OF_APP: TraceEpoch = {
  uiThreadCpu: 350,
  jsThreadCpu: 2,
  processCpu: 353,
  frameDurationsMs: Array.from({ length: 600 }, () => 6),
  mountBatchCount: 600,
};

describe('mapAppClock', () => {
  it('gives the median offset of the Boundary signposts from the app clock', () => {
    assert.deepEqual(mapAppClock(SAMPLE, [5_025_000, 10_005_025_500]), {
      offsetNs: 5_000_500,
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
  it('moves the windows of the epochs to the clock of the trace', () => {
    assert.deepEqual(traceSpans([READING], { offsetNs: 1000, spreadNs: 0 }), [
      { startNs: 11_000, endNs: 10_000_011_000 },
    ]);
  });
});

describe('compareEpochs', () => {
  it('gives the signed, absolute and relative error and the gate of each value', () => {
    const [epoch] = compareEpochs(
      EPOCHS,
      [READING],
      [{ ...TRACE_OF_APP, uiThreadCpu: 344, jsThreadCpu: 3.5, processCpu: 365 }]
    );
    assert.deepEqual(epoch.uiThreadCpu, {
      app: 350,
      trace: 344,
      signedError: 6,
      absoluteError: 6,
      relativeError: 6 / 344,
      tolerance: 0.02 * 344,
      passes: true,
    });
    assert.equal(epoch.jsThreadCpu.tolerance, 1);
    assert.equal(epoch.jsThreadCpu.passes, false);
    assert.equal(epoch.processCpu.passes, false);
    assert.equal(epoch.mountBatchCount.passes, true);
    assert.deepEqual(epoch.updateCount, { app: 600, trace: 600 });
    assert.equal(epoch.uiUpdateDurationMedian?.passes, true);
    assert.equal(epoch.uiUpdateDurationP95?.tolerance, 0.05 * 6);
  });

  it('needs the exact mount count and trace frames for an equality claim', () => {
    const [epoch] = compareEpochs(
      EPOCHS,
      [READING],
      [{ ...TRACE_OF_APP, mountBatchCount: 599, frameDurationsMs: [] }]
    );
    assert.equal(epoch.mountBatchCount.passes, false);
    assert.deepEqual(epoch.uiUpdateDurationMedian, {
      app: 6,
      trace: null,
      signedError: null,
      absoluteError: null,
      relativeError: null,
      tolerance: null,
      passes: false,
    });
  });

  it('has no UI update values for an epoch with only the counter reads', () => {
    const endpoints = readEpoch(
      inAppSample({
        epochs: [{ load: 'none', collector: 'endpoints', seconds: 10 }],
        boundaries: [SAMPLE.boundaries[0], { ...END_BOUNDARY, updates: 0 }],
        updates: { beginNs: [], endNs: [], modelTimeNs: [] },
      }),
      0,
      60
    );
    const [epoch] = compareEpochs(
      [{ load: 'none', collector: 'endpoints', seconds: 10 }],
      [endpoints],
      [TRACE_OF_APP]
    );
    assert.equal(epoch.uiUpdateDurationMedian, null);
    assert.deepEqual(epoch.updateCount, { app: null, trace: 600 });
  });
});

describe('crosscheckVerdict', () => {
  it('passes the counters when all CPU values and mount counts are in their gates', () => {
    assert.deepEqual(
      crosscheckVerdict(compareEpochs(EPOCHS, [READING], [TRACE_OF_APP])),
      { counters: true, updateDurationsEqualTraceFrames: true }
    );
    assert.deepEqual(
      crosscheckVerdict(
        compareEpochs(
          EPOCHS,
          [READING],
          [{ ...TRACE_OF_APP, frameDurationsMs: [7] }]
        )
      ),
      { counters: true, updateDurationsEqualTraceFrames: false }
    );
  });
});
