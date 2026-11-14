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
// an iOS 27 simulator, built with Xcode 27.2.
const SIMULATOR_CONSOLE = fs
  .readFileSync(
    path.join(import.meta.dirname, 'fixtures', 'app-console-simulator.txt'),
    'utf8'
  )
  .split('\n');

function simulatorSample(): InAppSample {
  const prefix = 'ReanimatedBenchmark: SAMPLE ';
  const line = SIMULATOR_CONSOLE.find((text) => text.startsWith(prefix));
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
    const sample = simulatorSample();
    assert.deepEqual(
      [sample.mainThread, sample.jsThread],
      [19815880, 19816673]
    );
    const reading = readEpoch(sample, 0, 60);
    assertClose(reading.window.seconds, 10.0029399165);
    assertClose(reading.cpu.uiThreadCpu, 161.8730106864978);
    assertClose(reading.cpu.jsThreadCpu, 2.061593908605179);
    assertClose(reading.cpu.processCpu, 163.96359607185087);
    assert.equal(reading.updates?.durationsMs.length, 600);
    assertClose(reading.updates?.expectedSlots, 600.1763949900001);
    assert.equal(reading.updates?.missedDisplayLinkCallbacks, 0);
    assert.equal(reading.mountBatchCount, 600);
    assert.equal(reading.memory, 52098);
    assert.equal(reading.windowMemoryDelta, 3616);
  });

  it('reads the sample of the app without the error field', () => {
    assert.deepEqual(parsed(), inAppSample());
  });

  it('is a tool error for text that is not JSON or not a sample', () => {
    assert.throws(
      () => parseSampleLine('{"format":1', PLAN),
      /The SAMPLE line of the app is not JSON/
    );
    assert.throws(
      () => parseSampleLine(JSON.stringify({ format: 2 }), PLAN),
      /SAMPLE\.format must be one of 1[\s\S]*SAMPLE\.boundaries must be a list/
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
            epochs: [{ load: 'none', collector: 'endpoints', seconds: 10 }],
          })
        ),
      /The SAMPLE line has the epochs .*endpoints.*, the driver planned .*full/
    );
    assert.throws(
      () => parsed(inAppSample({ boundaries: [START_BOUNDARY] })),
      /has 1 boundaries for 1 epochs, expected 2/
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
  it('gives the CPU time for each second of the window and the UI updates', () => {
    const reading = readEpoch(parsed(), 0, 60);
    assert.deepEqual(reading.window, {
      startNs: 10_000,
      endNs: 10_000_010_000,
      seconds: 10,
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

  it('counts the display refreshes between two updates as missed', () => {
    const updates = steadyUpdates(600);
    const modelTimeNs = updates.modelTimeNs.map((time, i) =>
      i >= 300 ? time + Math.round(2 * PERIOD_NS) : time
    );
    const reading = readEpoch(
      parsed(inAppSample({ updates: { ...updates, modelTimeNs } })),
      0,
      60
    );
    assert.equal(reading.updates?.missedDisplayLinkCallbacks, 2 / 601);
  });

  it('is a tool error for updates that are not on the display cadence', () => {
    const updates = steadyUpdates(600);
    const modelTimeNs = updates.modelTimeNs.map((time, i) =>
      i >= 300 ? time + Math.round(0.5 * PERIOD_NS) : time
    );
    assert.throws(
      () =>
        readEpoch(
          parsed(inAppSample({ updates: { ...updates, modelTimeNs } })),
          0,
          60
        ),
      /model times of the UI updates 299 and 300 are 1\.500 display periods apart/
    );
  });

  it('has no update data for an epoch with only the counter reads', () => {
    const plan: SamplePlan = {
      epochs: [{ load: 'none', collector: 'endpoints', seconds: 10 }],
      start: 'ready',
    };
    const sample = inAppSample({
      epochs: plan.epochs.map((epoch) => ({ ...epoch })),
      boundaries: [START_BOUNDARY, { ...END_BOUNDARY, updates: 0 }],
      updates: steadyUpdates(0),
    });
    const reading = readEpoch(parseSampleLine(sampleText(sample), plan), 0, 60);
    assert.equal(reading.updates, null);
    assert.equal(reading.cpu.uiThreadCpu, 350);
  });

  it('is a tool error for a counter that goes down', () => {
    assert.throws(
      () =>
        readEpoch(
          parsed(
            inAppSample({
              boundaries: [
                START_BOUNDARY,
                { ...END_BOUNDARY, jsThreadCpuUs: 499_999 },
              ],
            })
          ),
          0,
          60
        ),
      /Epoch 0: the counter jsThreadCpuUs goes down from 500000 to 499999/
    );
  });

  it('is a tool error when the process time is less than the two threads', () => {
    assert.throws(
      () =>
        readEpoch(
          parsed(
            inAppSample({
              boundaries: [
                START_BOUNDARY,
                { ...END_BOUNDARY, processCpuUs: 5_500_000 },
              ],
            })
          ),
          0,
          60
        ),
      /the process CPU time \(350 ms\/s\) is less than the sum of the main thread and the JS thread \(352 ms\/s\)/
    );
  });

  it('is a tool error when the counter reads take too much of the window', () => {
    assert.throws(
      () =>
        readEpoch(
          parsed(
            inAppSample({
              boundaries: [
                { ...START_BOUNDARY, readEndNs: 10_000_000 },
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
      /the UI update 0 \(10000 ns to 6010000 ns\) is not inside the epoch \(20000 ns to 10000000000 ns\)/
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
      () =>
        appStates(
          parsed(
            inAppSample({
              boundaries: [
                START_BOUNDARY,
                { ...END_BOUNDARY, batteryState: 7 },
              ],
            })
          )
        ),
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
    assert.equal(
      highestThermalState(
        parsed(
          inAppSample({
            boundaries: [START_BOUNDARY, { ...END_BOUNDARY, thermal: 1 }],
          })
        )
      ),
      1
    );
  });
});
