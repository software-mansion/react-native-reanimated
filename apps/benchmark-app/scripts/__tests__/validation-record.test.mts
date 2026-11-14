import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import { MEASUREMENT_REVISION } from '../measurement-rules.mts';
import { metricValidity, readValidationRecord } from '../validation-record.mts';
import type { ValidationRecord } from '../validation-record.mts';
import {
  readCrosscheckResult,
  readObserverCostResult,
} from '../validation-sources.mts';
import type {
  CrosscheckResult,
  ValidationIdentity,
} from '../validation-sources.mts';
import { useTestRoot } from './command-fake.mts';
import {
  LOADS_PLAN,
  STEADY_PLAN,
  crosscheckEpochs,
  validationSources,
} from './validation-fixtures.mts';
import type { Plan } from './validation-fixtures.mts';

const TEST_ROOT = useTestRoot('validation-record', {});

const SOURCES_DIR = path.join(TEST_ROOT.root, 'sources');

const IDENTITY: ValidationIdentity = {
  platform: 'ios',
  device: {
    model: 'iPhone 14 (iPhone14,7)',
    deviceId: 'UDID1',
    osBuild: '24A446',
  },
  measurementRevision: MEASUREMENT_REVISION,
  appBuild: 'build1',
};

const METRICS = ['uiThreadCpu', 'jsThreadCpu', 'memory'] as const;

const { writeCrosscheck, writeObserverCost, record } = validationSources(
  SOURCES_DIR,
  IDENTITY
);

function changeStored(folder: string, file: string, change: object) {
  const stored = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));
  fs.writeFileSync(
    path.join(folder, file),
    JSON.stringify({ ...stored, ...change })
  );
}

function validated(built: ValidationRecord) {
  return Object.fromEntries(
    Object.entries(built.metrics).map(([metric, validation]) => [
      metric,
      validation?.validated,
    ])
  );
}

function writeRecord(built: unknown): string {
  const file = path.join(TEST_ROOT.root, 'validation.json');
  fs.writeFileSync(file, JSON.stringify(built));
  return file;
}

beforeEach(() => fs.rmSync(SOURCES_DIR, { recursive: true, force: true }));

describe('buildValidationRecord', () => {
  it('validates each verdict metric when each required gate passes', () => {
    const built = record();
    assert.deepEqual(validated(built), {
      uiThreadCpu: true,
      jsThreadCpu: true,
      memory: true,
    });
    assert.equal(built.appBuild, 'build1');
    assert.equal(built.sources.crosschecks.length, 2);
    assert.match(built.sources.crosschecks[0].sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(
      built.metrics.memory?.gates.map((gate) => gate.gate),
      [
        'at least 2 cross-check recordings (here 2)',
        'a cross-check of a benchmark scenario with `full` and `endpoints` epochs of one load',
        'a cross-check of `crosscheck-load` with the loads idle, ui-stall, js-load, render-heavy',
        'an observer-cost test of `idle-cost`',
        'an observer-cost test of a loaded benchmark scenario',
        'worklet-styles-transform: the result has 4 epoch results',
        'worklet-styles-transform: the thermal state stayed Nominal',
        'worklet-styles-transform: `phys_footprint` against `memory-physical-footprint` of Activity Monitor',
        'crosscheck-load: the result has 4 epoch results',
        'crosscheck-load: the thermal state stayed Nominal',
        'crosscheck-load: `phys_footprint` against `memory-physical-footprint` of Activity Monitor',
        'idle-cost: observer cost of memory (5 blocks)',
        'worklet-styles-transform: observer cost of memory (5 blocks)',
      ]
    );
  });

  it('does not validate without the coverage of the plans and the scenarios', () => {
    const noneFull: Plan = [['none', 'full']];
    assert.deepEqual(
      validated(
        record([
          writeCrosscheck('first', noneFull),
          writeCrosscheck('second', noneFull),
        ])
      ),
      { uiThreadCpu: false, jsThreadCpu: false, memory: false }
    );
    assert.deepEqual(
      validated(
        record(undefined, [
          writeObserverCost('loaded', 'worklet-styles-transform'),
          writeObserverCost('other', 'css'),
        ])
      ),
      { uiThreadCpu: false, jsThreadCpu: false, memory: false }
    );
  });

  it('does not validate a metric with a failed gate or a gate without a result', () => {
    const steady = () => writeCrosscheck('steady', STEADY_PLAN);
    const loads = (change: Partial<CrosscheckResult>) =>
      writeCrosscheck('loads', LOADS_PLAN, change);
    assert.deepEqual(
      validated(
        record([steady(), loads({ epochs: crosscheckEpochs(LOADS_PLAN, 300) })])
      ),
      { uiThreadCpu: false, jsThreadCpu: true, memory: true }
    );
    assert.deepEqual(
      validated(
        record([
          steady(),
          loads({
            verdict: {
              counters: true,
              loadsRan: true,
              memory: 'not available',
              updateDurationQuantilesWithinTolerance: false,
            },
          }),
        ])
      ),
      { uiThreadCpu: true, jsThreadCpu: true, memory: false }
    );
    assert.deepEqual(
      validated(record([steady(), loads({ thermalState: 1 })])),
      { uiThreadCpu: false, jsThreadCpu: false, memory: false }
    );
    assert.deepEqual(
      validated(
        record(undefined, [
          writeObserverCost('idle', 'idle-cost'),
          writeObserverCost('loaded', 'worklet-styles-transform', (metric) =>
            metric === 'jsThreadCpu' ? 'not validated' : 'passed'
          ),
        ])
      ),
      { uiThreadCpu: true, jsThreadCpu: false, memory: true }
    );
  });

  it('refuses the same measurement twice: one folder, a copy of a folder, or one trace', () => {
    const steady = writeCrosscheck('steady', STEADY_PLAN);
    const loads = writeCrosscheck('loads', LOADS_PLAN);
    assert.throws(
      () => record([steady, loads, steady]),
      /The validation sources repeat one measurement \(the same folder, result file or trace\): .*steady/
    );
    const copy = path.join(SOURCES_DIR, 'copy');
    fs.cpSync(steady, copy, { recursive: true });
    assert.throws(
      () => record([steady, loads, copy]),
      /repeat one measurement .*: [0-9a-f]{64}, .*steady\/recording\.trace$/
    );
    const other = writeCrosscheck('other', STEADY_PLAN, {
      trace: path.join(steady, 'recording.trace'),
    });
    changeStored(other, 'crosscheck.json', { thermalState: 0, extra: 1 });
    assert.throws(
      () => record([steady, loads, other]),
      /repeat one measurement .*: [^,]*steady\/recording\.trace$/
    );
    const idle = writeObserverCost('idle', 'idle-cost');
    assert.throws(
      () => record(undefined, [idle, idle]),
      /repeat one measurement/
    );
  });

  it('stops when the sources are not of one setup or the app has no build identity', () => {
    const loaded = writeObserverCost('loaded', 'css');
    changeStored(loaded, 'observer-cost.json', { appBuild: 'build2' });
    assert.throws(
      () => record(undefined, [writeObserverCost('idle', 'idle-cost'), loaded]),
      /loaded is not of the same setup as .*steady: app build build1 -> build2/
    );
    assert.throws(
      () =>
        record([
          writeCrosscheck('steady', STEADY_PLAN, { appBuild: '' }),
          writeCrosscheck('loads', LOADS_PLAN, { appBuild: '' }),
        ]),
      /steady measured an app without an app build identity/
    );
  });
});

describe('the validation sources', () => {
  it('refuses a cross-check without epochs or with epochs that are not the plan', () => {
    const empty = writeCrosscheck('empty', [], { footprints: [] });
    assert.throws(
      () => readCrosscheckResult(empty),
      /crosscheck\.json is not a complete validation result:\n {2}- the plan has no epoch/
    );
    const missing = writeCrosscheck('missing', STEADY_PLAN, {
      epochs: crosscheckEpochs(STEADY_PLAN).slice(1),
    });
    assert.throws(
      () => readCrosscheckResult(missing),
      /it has 3 epoch results for 4 planned epochs/
    );
  });

  it('refuses an observer-cost test with fewer than 5 complete blocks', () => {
    for (const blocks of [0, 4]) {
      assert.throws(
        () =>
          readObserverCostResult(
            writeObserverCost(
              `blocks-${blocks}`,
              'idle-cost',
              () => 'passed',
              blocks
            )
          ),
        new RegExp(
          `it has ${blocks} complete blocks of ${blocks} planned blocks, and it needs at least 5`
        )
      );
    }
  });
});

describe('readValidationRecord', () => {
  it('reads a record whose flags and gates follow from its sources', () => {
    const built = record();
    assert.deepEqual(readValidationRecord(writeRecord(built)), built);
  });

  it('refuses a record whose flag does not match its gates or whose gates do not follow from its sources', () => {
    const built = record([
      writeCrosscheck('steady', STEADY_PLAN),
      writeCrosscheck('loads', LOADS_PLAN, { thermalState: 1 }),
    ]);
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            metrics: {
              ...built.metrics,
              memory: { ...built.metrics.memory, validated: true },
            },
          })
        ),
      /is not a valid validation record:\n {2}- the flag of memory does not match its gates/
    );
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            metrics: {
              ...built.metrics,
              uiThreadCpu: { validated: true, gates: [] },
            },
          })
        ),
      /the gates of uiThreadCpu do not follow from its sources/
    );
    const { memory: _memory, ...withoutMemory } = built.metrics;
    assert.throws(
      () =>
        readValidationRecord(writeRecord({ ...built, metrics: withoutMemory })),
      /it has no entry for memory/
    );
    assert.throws(
      () => readValidationRecord(writeRecord({ ...built, appBuild: 1 })),
      /- validation\.appBuild must be a string/
    );
  });

  it('refuses a record with the same source twice', () => {
    const built = record();
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            sources: {
              ...built.sources,
              crosschecks: [
                built.sources.crosschecks[0],
                built.sources.crosschecks[0],
              ],
            },
          })
        ),
      /The validation sources repeat one measurement/
    );
  });
});

describe('metricValidity', () => {
  it('gives the metrics that the gates of the record validate for the setup of the run, not its flags', () => {
    const built = record(undefined, [
      writeObserverCost('idle', 'idle-cost'),
      writeObserverCost('loaded', 'worklet-styles-transform', (metric) =>
        metric === 'memory' ? 'failed' : 'passed'
      ),
    ]);
    assert.deepEqual(metricValidity(built, IDENTITY, METRICS), {
      validated: ['uiThreadCpu', 'jsThreadCpu'],
      reason: 'the validation record does not validate memory',
    });
    assert.deepEqual(
      metricValidity(
        {
          ...built,
          metrics: {
            ...built.metrics,
            memory: { validated: true, gates: [] },
          },
        },
        IDENTITY,
        METRICS
      ).validated,
      ['uiThreadCpu', 'jsThreadCpu']
    );
  });

  it('validates no metric without a record or for another setup', () => {
    const built = record();
    assert.deepEqual(metricValidity(null, IDENTITY, METRICS), {
      validated: [],
      reason: 'the run has no validation record',
    });
    assert.deepEqual(metricValidity(built, null, METRICS), {
      validated: [],
      reason: 'the builds of the run do not have one app build identity',
    });
    assert.deepEqual(
      metricValidity(
        built,
        {
          ...IDENTITY,
          device: { ...IDENTITY.device, osBuild: '24B1' },
          appBuild: 'build2',
        },
        METRICS
      ),
      {
        validated: [],
        reason:
          'the validation record does not fit the run: OS build 24A446 -> 24B1, app build build1 -> build2',
      }
    );
  });
});
