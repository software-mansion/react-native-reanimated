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
  footprints,
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

const METRICS = ['uiThreadCpu', 'jsThreadCpu'] as const;

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
    });
    assert.equal(built.appBuild, 'build1');
    assert.equal(built.sources.crosschecks.length, 2);
    assert.match(built.sources.crosschecks[0].sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(
      built.metrics.jsThreadCpu?.gates.map((gate) => gate.gate),
      [
        'at least 2 cross-check recordings (here 2)',
        'a cross-check of a benchmark scenario with `full` and `endpoints` epochs of one load',
        'a cross-check of `crosscheck-load` with the loads idle, ui-stall, js-load, render-heavy',
        'an observer-cost test of `idle-cost`',
        'an observer-cost test of a loaded benchmark scenario',
        ...[
          ['worklet-styles-transform', STEADY_PLAN],
          ['crosscheck-load', LOADS_PLAN],
        ].flatMap(([scenario, plan]) => [
          `${scenario}: the result has 4 epoch results`,
          `${scenario}: the thermal state stayed Nominal`,
          `${scenario}: the planned loads ran`,
          ...(plan as Plan).map(
            ([load, collector], i) =>
              `${scenario}: epoch ${i} (${load}, ${collector}): jsThreadCpu against \`thread-state\``
          ),
        ]),
        'idle-cost: observer cost of jsThreadCpu (5 blocks)',
        'worklet-styles-transform: observer cost of jsThreadCpu (5 blocks)',
      ]
    );
    assert.equal(built.metrics.memory, undefined);
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
      { uiThreadCpu: false, jsThreadCpu: false }
    );
    assert.deepEqual(
      validated(
        record(undefined, [
          writeObserverCost('loaded', 'worklet-styles-transform'),
          writeObserverCost('other', 'css'),
        ])
      ),
      { uiThreadCpu: false, jsThreadCpu: false }
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
      { uiThreadCpu: false, jsThreadCpu: true }
    );
    assert.deepEqual(
      validated(record([steady(), loads({ thermalState: 1 })])),
      { uiThreadCpu: false, jsThreadCpu: false }
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
      { uiThreadCpu: true, jsThreadCpu: false }
    );
  });

  it('does not validate memory, and its data does not change the validation of the CPU metrics', () => {
    const built = record(
      [
        writeCrosscheck('steady', STEADY_PLAN, {
          footprints: footprints(5, () => null),
        }),
        writeCrosscheck('loads', LOADS_PLAN, {
          footprints: footprints(5, (boundary) =>
            boundary === 0 ? [42_000, 42_000] : [40_000, 40_000]
          ),
        }),
      ],
      [
        writeObserverCost('idle', 'idle-cost'),
        writeObserverCost('loaded', 'worklet-styles-transform', (metric) =>
          metric === 'memory' ? 'failed' : 'passed'
        ),
      ]
    );
    assert.deepEqual(validated(built), {
      uiThreadCpu: true,
      jsThreadCpu: true,
    });
    assert.deepEqual(
      metricValidity(built, IDENTITY, ['uiThreadCpu', 'memory']),
      {
        validated: ['uiThreadCpu'],
        reason: 'the validation record does not validate memory',
      }
    );
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            metrics: {
              ...built.metrics,
              memory: { validated: true, gates: [] },
            },
          })
        ),
      /- memory is not a verdict metric of iOS/
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
      /crosscheck\.json is not a complete validation result:\n {2}- crosscheck: the plan has no epoch/
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
          `it has ${blocks} complete blocks in ${blocks * 4} samples for ${blocks} planned blocks, and it needs at least 5`
        )
      );
    }
  });

  it('refuses a cross-check whose stored outcomes do not follow from its values', () => {
    const refusal = (change: Partial<CrosscheckResult>) => {
      const folder = writeCrosscheck('forged', LOADS_PLAN, change);
      try {
        readCrosscheckResult(folder);
        return null;
      } catch (error) {
        return (error as Error).message;
      } finally {
        fs.rmSync(folder, { recursive: true });
      }
    };
    const withoutWork = crosscheckEpochs(LOADS_PLAN).map((epoch) => ({
      ...epoch,
      work: { own: 0, other: 0 },
    }));
    assert.match(
      refusal({
        epochs: withoutWork,
        verdict: {
          counters: true,
          loadsRan: true,
          memory: 'passed',
          updateDurationQuantilesWithinTolerance: false,
        },
      }) ?? '',
      /- crosscheck: epoch 1: the stored workProof does not follow from its values[\s\S]*- crosscheck: verdict\.loadsRan is true, but the epochs and the footprints give false/
    );
    assert.match(
      refusal({
        footprints: footprints(5, () => null),
        verdict: {
          counters: true,
          loadsRan: true,
          memory: 'passed',
          updateDurationQuantilesWithinTolerance: false,
        },
      }) ?? '',
      /- crosscheck: verdict\.memory is passed, but the epochs and the footprints give not available/
    );
    const failed = footprints(5, (boundary) =>
      boundary === 0 ? [42_000, 42_000] : [40_000, 40_000]
    );
    assert.match(
      refusal({
        footprints: [{ ...failed[0], passes: true }, ...failed.slice(1)],
        verdict: {
          counters: true,
          loadsRan: true,
          memory: 'passed',
          updateDurationQuantilesWithinTolerance: false,
        },
      }) ?? '',
      /- crosscheck: footprint 0: the stored comparison does not follow from its read and its rows\n {2}- crosscheck: verdict\.memory is passed, but the epochs and the footprints give failed/
    );
    const [first, ...rest] = crosscheckEpochs(LOADS_PLAN, 300);
    assert.match(
      refusal({
        epochs: [
          { ...first, uiThreadCpu: { ...first.uiThreadCpu, passes: true } },
          ...rest,
        ],
      }) ?? '',
      /- crosscheck: epoch 0: the stored uiThreadCpu does not follow from its values/
    );
    assert.match(
      refusal({
        tolerances: {
          cpu: { absolute: 5, relative: 0.1 },
          updateDuration: { absolute: 0.25, relative: 0.05 },
          memory: { absolute: 1024, relative: 0.02 },
        },
      }) ?? '',
      /its tolerances are not the tolerances of this driver/
    );
  });

  it('refuses an observer-cost test without its numbers or with a cost that does not follow from them', () => {
    const stripped = writeObserverCost('stripped', 'idle-cost');
    const file = path.join(stripped, 'observer-cost.json');
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(
      file,
      JSON.stringify({
        ...stored,
        samples: stored.samples.map(
          ({ block, collector }: { block: number; collector: string }) => ({
            block,
            collector,
          })
        ),
        costs: stored.costs.map(
          ({
            metric,
            blocks,
            outcome,
          }: {
            metric: string;
            blocks: number;
            outcome: string;
          }) => ({ metric, blocks, outcome })
        ),
      })
    );
    assert.throws(
      () => readObserverCostResult(stripped),
      /- observer-cost\.samples\[0\]\.uiThreadCpu must be a finite number[\s\S]*- observer-cost\.costs\[0\]\.medianEndpoints must be a finite number/
    );
    const forced = writeObserverCost('forced', 'idle-cost', (metric) =>
      metric === 'memory' ? 'failed' : 'passed'
    );
    const forcedFile = path.join(forced, 'observer-cost.json');
    const result = JSON.parse(fs.readFileSync(forcedFile, 'utf8'));
    result.costs[3].outcome = 'passed';
    fs.writeFileSync(forcedFile, JSON.stringify(result));
    assert.throws(
      () => readObserverCostResult(forced),
      /- observer-cost: the stored cost of memory does not follow from the samples and its noise limit/
    );
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
              jsThreadCpu: { ...built.metrics.jsThreadCpu, validated: true },
            },
          })
        ),
      /is not a valid validation record:\n {2}- the flag of jsThreadCpu does not match its gates/
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
    const { jsThreadCpu: _jsThreadCpu, ...withoutJs } = built.metrics;
    assert.throws(
      () => readValidationRecord(writeRecord({ ...built, metrics: withoutJs })),
      /it has no entry for jsThreadCpu/
    );
    assert.throws(
      () => readValidationRecord(writeRecord({ ...built, appBuild: 1 })),
      /- validation\.appBuild must be a string/
    );
  });

  it('refuses a record whose embedded source was changed after the build', () => {
    const built = record();
    const [steady, loads] = built.sources.crosschecks;
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            sources: {
              ...built.sources,
              crosschecks: [
                steady,
                {
                  ...loads,
                  result: {
                    ...loads.result,
                    verdict: { ...loads.result.verdict, loadsRan: false },
                  },
                },
              ],
            },
          })
        ),
      /- validation\.sources\.crosschecks\[1\]\.result: verdict\.loadsRan is false, but the epochs and the footprints give true$/
    );
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            sources: {
              ...built.sources,
              crosschecks: [
                steady,
                {
                  ...loads,
                  result: { ...loads.result, report: { version: 1, load: 81 } },
                },
              ],
            },
          })
        ),
      /- validation\.sources\.crosschecks\[1\]\.sha256 is not the SHA-256 of its result$/
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
        metric === 'jsThreadCpu' ? 'failed' : 'passed'
      ),
    ]);
    assert.deepEqual(metricValidity(built, IDENTITY, METRICS), {
      validated: ['uiThreadCpu'],
      reason: 'the validation record does not validate jsThreadCpu',
    });
    assert.deepEqual(
      metricValidity(
        {
          ...built,
          metrics: {
            ...built.metrics,
            jsThreadCpu: { validated: true, gates: [] },
          },
        },
        IDENTITY,
        METRICS
      ).validated,
      ['uiThreadCpu']
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
