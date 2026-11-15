import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  appStates,
  highestThermalState,
  parseSampleLine,
  planArguments,
  readEpoch,
} from '../in-app-sample.mts';
import type { InAppSample, SamplePlan } from '../in-app-sample.mts';
import {
  END_BOUNDARY,
  START_BOUNDARY,
  inAppSample,
  sampleText,
  steadyUpdates,
} from './ios-fixtures.mts';

const PLAN: SamplePlan = {
  epochs: [{ load: 'none', collector: 'full', seconds: 10 }],
  start: 'ready',
};

const PERIOD_NS = 1e9 / 60;

// The console lines of the app in one sample of worklet-styles-transform on
// an iPhone 14 with iOS 27.2, built with Xcode 27.2.
const IPHONE_CONSOLE = fs
  .readFileSync(
    path.join(import.meta.dirname, 'fixtures', 'app-console-iphone14.txt'),
    'utf8'
  )
  .split('\n');

function iphoneSample(): InAppSample {
  const prefix = 'ReanimatedBenchmark: SAMPLE ';
  const line = IPHONE_CONSOLE.find((text) => text.startsWith(prefix));
  return parseSampleLine(line?.slice(prefix.length) ?? '', PLAN);
}

function assertClose(actual: number | undefined | null, expected: number) {
  assert.ok(
    typeof actual === 'number' && Math.abs(actual - expected) < 1e-6,
    `${actual} is not ${expected}`
  );
}

function parsed(sample: InAppSample = inAppSample()): InAppSample {
  return parseSampleLine(sampleText(sample), PLAN);
}

function withEnd(change: Partial<typeof END_BOUNDARY>): InAppSample {
  return parsed(
    inAppSample({
      boundaries: [START_BOUNDARY, { ...END_BOUNDARY, ...change }],
    })
  );
}

function withModelTimes(shift: (time: number, index: number) => number) {
  const updates = steadyUpdates(600);
  return parsed(
    inAppSample({
      updates: { ...updates, modelTimeNs: updates.modelTimeNs.map(shift) },
    })
  );
}

describe('planArguments', () => {
  it('gives the launch arguments of the epochs and the start', () => {
    assert.deepEqual(
      planArguments({
        epochs: [
          { load: 'idle', collector: 'full', seconds: 2 },
          { load: 'js-load', collector: 'endpoints', seconds: 2.5 },
        ],
        start: 'notification',
      }),
      [
        '-benchmarkEpochs',
        'idle:full:2,js-load:endpoints:2.5',
        '-benchmarkStart',
        'notification',
      ]
    );
  });
});

describe('parseSampleLine', () => {
  it('reads a SAMPLE line of the app', () => {
    const sample = iphoneSample();
    const reading = readEpoch(sample, 0, 60);
    assert.ok(reading.window.seconds > 9.99 && reading.window.seconds < 10.01);
    assert.ok(reading.cpu.processCpu >= reading.cpu.uiThreadCpu);
    assert.ok((reading.updates?.durationsMs.length ?? 0) >= 590);
    assert.ok(reading.cpuUncertainty.uiThread < 0.01);
    assert.ok(
      reading.performanceCoreShare !== null &&
        reading.performanceCoreShare >= 0 &&
        reading.performanceCoreShare <= 1
    );
    assert.ok(reading.clusterSwitches >= 0);
    assert.deepEqual(sample.epochs[0].work, { own: 0, other: 0 });
  });

  it('reads the sample of the app without the error field', () => {
    assert.deepEqual(parsed(), inAppSample());
  });

  it('is a tool error for text that is not JSON or not a sample', () => {
    assert.throws(
      () => parseSampleLine('{"format":2', PLAN),
      /The SAMPLE line of the app is not JSON/
    );
    assert.throws(
      () => parseSampleLine(JSON.stringify({ format: 1 }), PLAN),
      /SAMPLE\.format must be one of 4[\s\S]*SAMPLE\.boundaries must be a list/
    );
  });

  it('gives the error of the sampler as a tool error', () => {
    assert.throws(
      () =>
        parseSampleLine(
          sampleText(inAppSample(), 'thread_info failed for the JS thread'),
          PLAN
        ),
      /The in-app sampler failed: thread_info failed for the JS thread/
    );
  });

  it('is a tool error when the app did not take the planned epochs', () => {
    assert.throws(
      () =>
        parsed(
          inAppSample({
            epochs: [
              {
                load: 'none',
                collector: 'endpoints',
                seconds: 10,
                work: { own: 0, other: 0 },
              },
            ],
          })
        ),
      /The SAMPLE line has the epochs .*endpoints.*, the driver planned .*full/
    );
    assert.throws(
      () => parsed(inAppSample({ boundaries: [START_BOUNDARY] })),
      /has 1 boundaries for 1 epochs, expected 2/
    );
  });

  it('is a tool error when a read bracket is reversed or the reads are not in the order of the sampler', () => {
    const withStart = (change: Partial<typeof START_BOUNDARY>) =>
      parsed(
        inAppSample({
          boundaries: [{ ...START_BOUNDARY, ...change }, END_BOUNDARY],
        })
      );
    assert.throws(
      () => withStart({ uiReadStartNs: 4_000, uiReadEndNs: 3_000 }),
      /Boundary 0 of the SAMPLE line: uiReadEndNs \(3000 ns\) is before uiReadStartNs \(4000 ns\)\. The reads are not in the order of the sampler\./
    );
    assert.throws(
      () => withStart({ footprintReadStartNs: 19_000 }),
      /Boundary 0 of the SAMPLE line: footprintReadStartNs \(19000 ns\) is before processReadEndNs \(20000 ns\)/
    );
    assert.throws(
      () =>
        parsed(
          inAppSample({
            boundaries: [
              START_BOUNDARY,
              { ...END_BOUNDARY, uiReadStartNs: 27_000, uiReadEndNs: 27_500 },
            ],
          })
        ),
      /Boundary 1 of the SAMPLE line: uiReadStartNs \(27000 ns\) is before signpostEndNs \(28000 ns\) of the boundary before it/
    );
    assert.throws(
      () => parsed(inAppSample({ cpuCount: 0 })),
      /SAMPLE\.cpuCount must be a positive number/
    );
  });

  it('is a tool error when the update lists do not agree', () => {
    const updates = steadyUpdates(600);
    assert.throws(
      () =>
        parsed(
          inAppSample({
            updates: { ...updates, endNs: updates.endNs.slice(1) },
          })
        ),
      /do not have the same length/
    );
    assert.throws(
      () => parsed(inAppSample({ updates: steadyUpdates(599) })),
      /has 599 updates, and its last boundary counts 600/
    );
  });
});

describe('readEpoch', () => {
  it('gives the CPU time for each second between the reads of each counter, and the UI updates', () => {
    const reading = readEpoch(parsed(), 0, 60);
    assert.deepEqual(reading.window, {
      startNs: 10_000,
      endNs: 10_000_010_000,
      seconds: 10,
    });
    assert.deepEqual(reading.counterSpans, {
      uiThread: { startNs: 2_500, endNs: 10_000_002_500 },
      jsThread: { startNs: 7_500, endNs: 10_000_007_500 },
      process: { startNs: 15_000, endNs: 10_000_015_000 },
    });
    assert.deepEqual(reading.cpu, {
      uiThreadCpu: 350,
      jsThreadCpu: 2,
      otherThreadsCpu: 1,
      processCpu: 353,
    });
    assert.equal(reading.updates?.durationsMs.length, 600);
    assert.ok(reading.updates?.durationsMs.every((ms) => ms === 6));
    assert.equal(reading.updates?.expectedSlots, 600);
    assert.equal(reading.updates?.missedDisplayLinkCallbacks, 0);
    assert.equal(reading.mountBatchCount, 600);
    assert.equal(reading.memory, 40_300);
    assert.equal(reading.windowMemoryDelta, 300);
  });

  it('gives the share of the process CPU time on the performance cores and the processor set switches from the process counter reads', () => {
    const reading = readEpoch(parsed(), 0, 60);
    assertClose(reading.performanceCoreShare, 2_824_000 / 3_530_000);
    assert.equal(reading.clusterSwitches, 150);
  });

  it('gives no performance-core share when the process has no CPU time in the window', () => {
    const reading = readEpoch(
      withEnd({
        uiThreadCpuUs: START_BOUNDARY.uiThreadCpuUs,
        jsThreadCpuUs: START_BOUNDARY.jsThreadCpuUs,
        processCpuUs: START_BOUNDARY.processCpuUs,
        processPerformanceCpuUs: START_BOUNDARY.processPerformanceCpuUs,
      }),
      0,
      60
    );
    assert.equal(reading.performanceCoreShare, null);
  });

  it('gives the timing uncertainty of each CPU value from its read brackets, the cores that its counter can count and the counter resolution', () => {
    const { cpuUncertainty, counterCores } = readEpoch(parsed(), 0, 60);
    assert.deepEqual(counterCores, { uiThread: 1, jsThread: 1, process: 6 });
    assertClose(cpuUncertainty.uiThread, (2_500 + 2_500 + 2_000) / 1e6 / 10);
    assertClose(cpuUncertainty.jsThread, (2_500 + 2_500 + 2_000) / 1e6 / 10);
    assertClose(
      cpuUncertainty.process,
      ((5_000 + 5_000) * 6 + 2_000) / 1e6 / 10
    );
  });

  it('counts the display refreshes between two updates as missed', () => {
    const reading = readEpoch(
      withModelTimes((time, i) =>
        i >= 300 ? time + Math.round(2 * PERIOD_NS) : time
      ),
      0,
      60
    );
    assert.equal(reading.updates?.missedDisplayLinkCallbacks, 2 / 601);
  });

  it('is a tool error for updates that are not on the display cadence', () => {
    assert.throws(
      () =>
        readEpoch(
          withModelTimes((time, i) =>
            i >= 300 ? time + Math.round(0.5 * PERIOD_NS) : time
          ),
          0,
          60
        ),
      /model times of the UI updates 299 and 300 are 1\.500 display periods apart/
    );
  });

  it('is a tool error when the updates run at a fraction of the display rate in the whole epoch', () => {
    const updates = steadyUpdates(300);
    const modelTimeNs = updates.modelTimeNs.map(
      (time, i) => time + Math.round(i * PERIOD_NS)
    );
    assert.throws(
      () =>
        readEpoch(
          parsed(
            inAppSample({
              boundaries: [START_BOUNDARY, { ...END_BOUNDARY, updates: 300 }],
              updates: { ...updates, modelTimeNs },
            })
          ),
          0,
          60
        ),
      /each UI update is 2 or more display periods after the one before it\. The app updates at most at 1\/2 of the display rate in the whole epoch\./
    );
  });

  it('has no update data for an epoch with only the counter reads', () => {
    const plan: SamplePlan = {
      epochs: [{ load: 'none', collector: 'endpoints', seconds: 10 }],
      start: 'ready',
    };
    const sample = inAppSample({
      epochs: [{ ...plan.epochs[0], work: { own: 0, other: 0 } }],
      boundaries: [START_BOUNDARY, { ...END_BOUNDARY, updates: 0 }],
      updates: steadyUpdates(0),
    });
    const reading = readEpoch(parseSampleLine(sampleText(sample), plan), 0, 60);
    assert.equal(reading.updates, null);
    assert.equal(reading.cpu.uiThreadCpu, 350);
  });

  it('is a tool error for a counter that goes down', () => {
    assert.throws(
      () => readEpoch(withEnd({ jsThreadCpuUs: 499_999 }), 0, 60),
      /Epoch 0: the counter jsThreadCpuUs goes down from 500000 to 499999/
    );
    assert.throws(
      () => readEpoch(withEnd({ processPerformanceCpuUs: 1_199_999 }), 0, 60),
      /Epoch 0: the counter processPerformanceCpuUs goes down from 1200000 to 1199999/
    );
    assert.throws(
      () => readEpoch(withEnd({ processClusterSwitches: 399 }), 0, 60),
      /Epoch 0: the counter processClusterSwitches goes down from 400 to 399/
    );
  });

  it('allows the performance-core time to grow more than the process time only by the counter resolution', () => {
    const processUs = 3_530_000;
    const reading = readEpoch(
      withEnd({ processPerformanceCpuUs: 1_200_000 + processUs + 2 }),
      0,
      60
    );
    assertClose(reading.performanceCoreShare, (processUs + 2) / processUs);
    assert.throws(
      () =>
        readEpoch(
          withEnd({ processPerformanceCpuUs: 1_200_000 + processUs + 3 }),
          0,
          60
        ),
      /Epoch 0: the process CPU time on the performance cores \(3530003 µs\) is more than the process CPU time \(3530000 µs\) by more than the counter resolution \(2 µs\)/
    );
  });

  it('allows the process time to be less than the two threads by the read delay at the start and the resolution', () => {
    const allowedUs = 20 + 15 + 6;
    const reading = readEpoch(
      withEnd({ processCpuUs: 2_000_000 + 3_520_000 - allowedUs }),
      0,
      60
    );
    assert.ok(reading.cpu.otherThreadsCpu < 0);
    assert.throws(
      () =>
        readEpoch(
          withEnd({ processCpuUs: 2_000_000 + 3_520_000 - allowedUs - 1 }),
          0,
          60
        ),
      /the process CPU time \(3519958 µs\) is less than the sum of the main thread and the JS thread \(3520000 µs\) by more than the read delay and the counter resolution \(41 µs\)/
    );
  });

  it('is a tool error when the counter reads take too much of the window', () => {
    assert.throws(
      () =>
        readEpoch(
          parsed(
            inAppSample({
              boundaries: [
                {
                  ...START_BOUNDARY,
                  processReadEndNs: 10_000_000,
                  footprintReadStartNs: 10_000_000,
                  footprintReadEndNs: 10_001_000,
                  signpostStartNs: 10_002_000,
                  signpostEndNs: 10_008_000,
                },
                END_BOUNDARY,
              ],
            })
          ),
          0,
          60
        ),
      /Epoch 0: the counter reads take 10020000 ns of a window of 9995010000 ns, more than 0\.1%/
    );
  });

  it('is a tool error for an update outside the epoch', () => {
    const updates = steadyUpdates(600, 10_000);
    assert.throws(
      () => readEpoch(parsed(inAppSample({ updates })), 0, 60),
      /the UI update 0 \(10000 ns to 6010000 ns\) is not inside the epoch \(28000 ns to 10000000000 ns\)/
    );
  });
});

describe('appStates', () => {
  it('gives the state of the device at each counter read', () => {
    assert.deepEqual(appStates(parsed()), [
      {
        batteryLevel: 100,
        batteryState: 'full',
        lowPowerMode: false,
        brightness: 50,
      },
      {
        batteryLevel: 100,
        batteryState: 'full',
        lowPowerMode: false,
        brightness: 50,
      },
    ]);
  });

  it('is a tool error for an unknown battery state', () => {
    assert.throws(
      () => appStates(withEnd({ batteryState: 7 })),
      /the unknown batteryState 7/
    );
  });
});

describe('highestThermalState', () => {
  it('takes the highest state of the reads and of the notifications', () => {
    assert.equal(highestThermalState(parsed()), 0);
    assert.equal(
      highestThermalState(parsed(inAppSample({ maxThermal: 2 }))),
      2
    );
    assert.equal(highestThermalState(withEnd({ thermal: 1 })), 1);
  });
});
