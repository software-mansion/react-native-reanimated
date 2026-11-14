import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { compareEpochs } from '../crosscheck.mts';
import type { CrosscheckEpoch } from '../crosscheck.mts';
import { readEpoch } from '../in-app-sample.mts';
import { MEASUREMENT_REVISION } from '../measurement-rules.mts';
import type { ObserverCost } from '../observer-cost.mts';
import {
  buildValidationRecord,
  metricValidity,
  readValidationRecord,
} from '../validation-record.mts';
import type { ValidationRecord } from '../validation-record.mts';
import { VALIDATION_SOURCE_FORMAT_VERSION } from '../validation-sources.mts';
import type {
  CrosscheckResult,
  ObserverCostResult,
  ValidationIdentity,
} from '../validation-sources.mts';
import { useTestRoot } from './command-fake.mts';
import { inAppSample } from './ios-fixtures.mts';

const TEST_ROOT = useTestRoot('validation-record', {});

const IDENTITY: ValidationIdentity = {
  platform: 'ios',
  device: {
    model: 'iPhone 14 (iPhone14,7)',
    deviceId: 'UDID1',
    osBuild: '24A446',
  },
  measurementRevision: MEASUREMENT_REVISION,
  appSources: 'sources1',
};

const SOURCE = {
  ...IDENTITY,
  formatVersion: VALIDATION_SOURCE_FORMAT_VERSION,
  applicationId: 'com.reanimatedbenchmark.a',
  report: { version: 1, load: 80 },
  tools: { node: 'v24', xcode: '27.2', xctrace: '27.2', devicectl: '1' },
} as const;

const SAMPLE = inAppSample();

function epochs(trace: Partial<{ uiThreadCpu: number }> = {}) {
  return compareEpochs(
    SAMPLE.epochs,
    [readEpoch(SAMPLE, 0, 60)],
    [
      {
        uiThreadCpu: 350,
        jsThreadCpu: 2,
        processCpu: 353,
        frameDurationsMs: [],
        mountBatchCount: 600,
        ...trace,
      },
    ],
    { offsetNs: 0, uncertaintyNs: 0, spreadNs: 0 },
    60
  );
}

function crosscheck(
  folder: string,
  change: Partial<CrosscheckResult> & { epochs?: CrosscheckEpoch[] } = {}
) {
  const result: CrosscheckResult = {
    ...SOURCE,
    scenario: 'crosscheck-load',
    plan: { epochs: SAMPLE.epochs, start: 'notification' },
    tolerances: {
      cpu: { absolute: 1, relative: 0.02 },
      updateDuration: { absolute: 0.25, relative: 0.05 },
      memory: { absolute: 1024, relative: 0.02 },
    },
    thermalState: 0,
    clock: { offsetNs: 0, uncertaintyNs: 0, spreadNs: 0 },
    epochs: epochs(),
    footprints: [],
    verdict: {
      counters: true,
      loadsRan: true,
      memory: 'passed',
      updateDurationQuantilesWithinTolerance: false,
    },
    trace: `${folder}/recording.trace`,
    ...change,
  };
  return { folder, result };
}

function observerCost(
  folder: string,
  scenario: string,
  outcome: (metric: ObserverCost['metric']) => ObserverCost['outcome'] = () =>
    'passed'
) {
  const result: ObserverCostResult = {
    ...SOURCE,
    scenario,
    blocks: 5,
    noiseLimitsFile: '/limits.json',
    samples: [],
    costs: (
      ['uiThreadCpu', 'jsThreadCpu', 'processCpu', 'memory'] as const
    ).map((metric) => ({
      metric,
      blocks: 5,
      medianEndpoints: 1,
      medianFull: 1,
      relativeDifference: 0,
      interval: { low: 0, high: 0 },
      noiseLimit: 0.08,
      allowed: 0.02,
      outcome: outcome(metric),
    })),
  };
  return { folder, result };
}

const CROSSCHECKS = [crosscheck('/c1'), crosscheck('/c2')];
const OBSERVER_COSTS = [
  observerCost('/o1', 'idle-cost'),
  observerCost('/o2', 'worklet-styles-transform'),
];

function validated(record: ValidationRecord) {
  return Object.fromEntries(
    Object.entries(record.metrics).map(([metric, validation]) => [
      metric,
      validation?.validated,
    ])
  );
}

describe('buildValidationRecord', () => {
  it('validates each verdict metric when all its gates pass', () => {
    const record = buildValidationRecord(CROSSCHECKS, OBSERVER_COSTS);
    assert.deepEqual(validated(record), {
      uiThreadCpu: true,
      jsThreadCpu: true,
      memory: true,
    });
    assert.equal(record.appSources, 'sources1');
    assert.deepEqual(record.sources, {
      crosschecks: ['/c1', '/c2'],
      observerCosts: ['/o1', '/o2'],
    });
    assert.deepEqual(
      record.metrics.jsThreadCpu?.gates.map((gate) => gate.gate),
      [
        'at least 2 cross-checks (here 2) and observer-cost tests of at least 2 scenarios (here 2)',
        'crosscheck-load: the thermal state stayed Nominal',
        'crosscheck-load: the planned loads ran',
        'crosscheck-load: epoch 0 (none, full): jsThreadCpu against `thread-state`',
        'crosscheck-load: the thermal state stayed Nominal',
        'crosscheck-load: the planned loads ran',
        'crosscheck-load: epoch 0 (none, full): jsThreadCpu against `thread-state`',
        'idle-cost: observer cost of jsThreadCpu',
        'worklet-styles-transform: observer cost of jsThreadCpu',
      ]
    );
  });

  it('does not validate a metric with too few sources, a failed gate or a gate without a result', () => {
    assert.deepEqual(
      validated(buildValidationRecord(CROSSCHECKS.slice(1), OBSERVER_COSTS)),
      { uiThreadCpu: false, jsThreadCpu: false, memory: false }
    );
    assert.deepEqual(
      validated(
        buildValidationRecord(CROSSCHECKS, [
          OBSERVER_COSTS[0],
          observerCost('/o3', 'idle-cost'),
        ])
      ),
      { uiThreadCpu: false, jsThreadCpu: false, memory: false }
    );
    assert.deepEqual(
      validated(
        buildValidationRecord(
          [
            crosscheck('/c1', { epochs: epochs({ uiThreadCpu: 300 }) }),
            CROSSCHECKS[1],
          ],
          OBSERVER_COSTS
        )
      ),
      { uiThreadCpu: false, jsThreadCpu: true, memory: true }
    );
    assert.deepEqual(
      validated(
        buildValidationRecord(
          [
            crosscheck('/c1', {
              verdict: {
                ...CROSSCHECKS[0].result.verdict,
                memory: 'not available',
              },
            }),
            CROSSCHECKS[1],
          ],
          OBSERVER_COSTS
        )
      ),
      { uiThreadCpu: true, jsThreadCpu: true, memory: false }
    );
    assert.deepEqual(
      validated(
        buildValidationRecord(CROSSCHECKS, [
          OBSERVER_COSTS[0],
          observerCost('/o2', 'worklet-styles-transform', (metric) =>
            metric === 'jsThreadCpu' ? 'not validated' : 'passed'
          ),
        ])
      ),
      { uiThreadCpu: true, jsThreadCpu: false, memory: true }
    );
    assert.deepEqual(
      validated(
        buildValidationRecord(
          [crosscheck('/c1', { thermalState: 1 }), CROSSCHECKS[1]],
          OBSERVER_COSTS
        )
      ),
      { uiThreadCpu: false, jsThreadCpu: false, memory: false }
    );
  });

  it('stops when the sources are not of one setup or the app has no hash of its sources', () => {
    assert.throws(
      () =>
        buildValidationRecord(CROSSCHECKS, [
          {
            folder: '/o1',
            result: { ...OBSERVER_COSTS[0].result, appSources: 'sources2' },
          },
        ]),
      /\/o1 is not of the same setup as \/c1: app sources sources1 -> sources2/
    );
    assert.throws(
      () =>
        buildValidationRecord(
          [crosscheck('/c1', { appSources: '' })],
          OBSERVER_COSTS
        ),
      /\/c1 measured an app without a hash of its sources/
    );
  });
});

describe('metricValidity', () => {
  const record = buildValidationRecord(CROSSCHECKS, [
    OBSERVER_COSTS[0],
    observerCost('/o2', 'worklet-styles-transform', (metric) =>
      metric === 'memory' ? 'failed' : 'passed'
    ),
  ]);
  const metrics = ['uiThreadCpu', 'jsThreadCpu', 'memory'] as const;

  it('gives the metrics that the record validates for the setup of the run', () => {
    assert.deepEqual(metricValidity(record, IDENTITY, metrics), {
      validated: ['uiThreadCpu', 'jsThreadCpu'],
      reason: 'the validation record does not validate memory',
    });
  });

  it('validates no metric without a record or for another setup', () => {
    assert.deepEqual(metricValidity(null, IDENTITY, metrics), {
      validated: [],
      reason: 'the run has no validation record',
    });
    assert.deepEqual(metricValidity(record, null, metrics), {
      validated: [],
      reason: 'the builds of the run do not have one hash of the app sources',
    });
    assert.deepEqual(
      metricValidity(
        record,
        {
          ...IDENTITY,
          device: { ...IDENTITY.device, osBuild: '24B1' },
          measurementRevision: MEASUREMENT_REVISION + 1,
        },
        metrics
      ),
      {
        validated: [],
        reason: `the validation record does not fit the run: OS build 24A446 -> 24B1, measurement revision ${MEASUREMENT_REVISION} -> ${MEASUREMENT_REVISION + 1}`,
      }
    );
  });
});

describe('readValidationRecord', () => {
  it('reads a record and refuses a file that is not one', () => {
    const file = path.join(TEST_ROOT.root, 'validation.json');
    const record = buildValidationRecord(CROSSCHECKS, OBSERVER_COSTS);
    fs.writeFileSync(file, JSON.stringify(record));
    assert.deepEqual(readValidationRecord(file), record);
    fs.writeFileSync(file, JSON.stringify({ ...record, appSources: 1 }));
    assert.throws(
      () => readValidationRecord(file),
      /is not a valid validation record:\n {2}- validation\.appSources must be a string/
    );
  });
});
