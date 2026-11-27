import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import { IOS_DEFINITION } from '../ios-definition.mts';
import { observerCosts } from '../observer-cost.mts';
import type { CollectorSample } from '../observer-cost.mts';
import {
  buildValidationRecord,
  metricValidity,
  readValidationRecord,
} from '../validation-record.mts';
import type { ValidationRecord } from '../validation-record.mts';
import {
  readCrosscheckResult,
  readEarlierCrosscheck,
  readKnownWorkResult,
  readObserverCostResult,
} from '../validation-sources.mts';
import type {
  CrosscheckResult,
  KnownWorkResult,
  ValidationIdentity,
} from '../validation-sources.mts';
import { useTestRoot } from './command-fake.mts';
import {
  LOADS_PLAN,
  STEADY_PLAN,
  appBoundaries,
  crosscheckEpochs,
  footprints,
  validationSources,
} from './validation-fixtures.mts';

const TEST_ROOT = useTestRoot('validation-record', {});

const SOURCES_DIR = path.join(TEST_ROOT.root, 'sources');

const IDENTITY: ValidationIdentity = {
  platform: 'ios',
  device: {
    model: 'iPhone 14 (iPhone14,7)',
    deviceId: 'UDID1',
    osBuild: '24A446',
  },
  measurementRevision: IOS_DEFINITION.measurementRevision,
  appBuild: 'build1',
};

const METRICS = ['processInstructionRate'] as const;

const { writeCrosscheck, writeKnownWork, writeObserverCost, record } =
  validationSources(SOURCES_DIR, IDENTITY);

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

function warmBoundaries(plan: readonly unknown[]) {
  return appBoundaries(plan.length + 1).map((boundary, i) => ({
    ...boundary,
    thermal: i === 2 ? 1 : 0,
  }));
}

function sha256Of(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function writeRecord(built: unknown): string {
  const file = path.join(TEST_ROOT.root, 'validation.json');
  fs.writeFileSync(file, JSON.stringify(built));
  return file;
}

beforeEach(() => fs.rmSync(SOURCES_DIR, { recursive: true, force: true }));

describe('buildValidationRecord', () => {
  it('validates the instruction metric when each required gate passes', () => {
    const built = record();
    assert.deepEqual(validated(built), { processInstructionRate: true });
    assert.equal(built.appBuild, 'build1');
    assert.equal(built.sources.knownWorks.length, 1);
    assert.match(built.sources.knownWorks[0].sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(
      built.metrics.processInstructionRate?.gates.map((gate) => gate.gate),
      [
        'a known-work test',
        'an observer-cost test of `idle-cost`',
        'an observer-cost test of a loaded benchmark scenario',
        'known-work: the thermal state stayed Nominal',
        'known-work: `known-work` ran its planned units',
        'known-work: `known-work-double` ran its planned units',
        'known-work: `known-work-background` ran its planned units',
        'known-work: `known-work-ended` ran its planned units',
        'known-work: `known-work-parallel` ran its planned units',
        'known-work: `known-work-main` ran its planned units',
        'known-work: no epoch counted units of another load',
        'known-work: `known-work`: instructions of the load against the count of the disassembly',
        'known-work: `known-work-double` against `known-work` (linearity)',
        'known-work: `known-work-background` (background QoS) against `known-work` (user-interactive QoS)',
        'known-work: `known-work-ended` (a thread that ended before the end read) against `known-work`',
        'known-work: `known-work-parallel` (4 threads at the same time): instructions of the load against the count of the disassembly',
        'known-work: `known-work-main` (the main thread): instructions of the load against the count of the disassembly',
        'idle-cost: observer cost of processInstructionRate (5 blocks)',
        'worklet-styles-transform: observer cost of processInstructionRate (5 blocks)',
      ]
    );
    assert.equal(built.metrics.uiThreadCpu, undefined);
  });

  it('does not validate without a known-work test or the observer-cost scenarios', () => {
    assert.deepEqual(validated(record([])), { processInstructionRate: false });
    assert.deepEqual(
      validated(
        record(undefined, [
          writeObserverCost('loaded', 'worklet-styles-transform'),
          writeObserverCost('other', 'css'),
        ])
      ),
      { processInstructionRate: false }
    );
  });

  it('does not validate with a failed known-work gate, a warm known-work test or a failed observer cost', () => {
    const outcomeOf = (built: ValidationRecord, gate: string) =>
      built.metrics.processInstructionRate?.gates.find(
        (candidate) => candidate.gate === gate
      )?.outcome;
    const ended = record([
      writeKnownWork('ended', (load) =>
        load === 'known-work-ended' ? 60_000_000 : 0
      ),
    ]);
    assert.deepEqual(validated(ended), { processInstructionRate: false });
    assert.equal(
      outcomeOf(
        ended,
        'known-work: `known-work-ended` (a thread that ended before the end read) against `known-work`'
      ),
      'failed'
    );
    const warm = record([
      writeKnownWork('warm', undefined, { reportedThermalState: 1 }),
    ]);
    assert.equal(
      outcomeOf(warm, 'known-work: the thermal state stayed Nominal'),
      'not validated'
    );
    assert.deepEqual(
      validated(
        record(undefined, [
          writeObserverCost('idle', 'idle-cost'),
          writeObserverCost('loaded', 'worklet-styles-transform', (metric) =>
            metric === 'processInstructionRate' ? 'failed' : 'passed'
          ),
        ])
      ),
      { processInstructionRate: false }
    );
  });

  it('keeps cross-checks as sources with no gate, and the other observer-cost metrics do not change the validation', () => {
    const crosschecks = [
      writeCrosscheck('steady', STEADY_PLAN),
      writeCrosscheck('loads', LOADS_PLAN, { thermalState: 1 }),
    ];
    const built = record(
      undefined,
      [
        writeObserverCost('idle', 'idle-cost'),
        writeObserverCost('loaded', 'worklet-styles-transform', (metric) =>
          metric === 'processInstructionRate' ? 'passed' : 'failed'
        ),
      ],
      crosschecks
    );
    assert.deepEqual(validated(built), { processInstructionRate: true });
    assert.equal(built.sources.crosschecks.length, 2);
    assert.ok(
      built.metrics.processInstructionRate?.gates.every(
        ({ source }) =>
          !built.sources.crosschecks.some(({ folder }) => folder === source)
      )
    );
    assert.deepEqual(readValidationRecord(writeRecord(built)), built);
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
      /- validation: uiThreadCpu is not a verdict metric of iOS/
    );
  });

  it('refuses the same measurement twice: one folder, a copy of a folder, or one trace', () => {
    const knownWork = writeKnownWork('known-work');
    assert.throws(
      () => record([knownWork, knownWork]),
      /The validation sources repeat one measurement \(the same folder, result file or trace\): .*known-work/
    );
    const copy = path.join(SOURCES_DIR, 'copy');
    fs.cpSync(knownWork, copy, { recursive: true });
    assert.throws(
      () => record([knownWork, copy]),
      /repeat one measurement .*: [0-9a-f]{64}$/
    );
    const steady = writeCrosscheck('steady', STEADY_PLAN);
    const other = writeCrosscheck('other', STEADY_PLAN, {
      trace: path.join(steady, 'recording.trace'),
    });
    changeStored(other, 'crosscheck.json', { thermalState: 0, extra: 1 });
    assert.throws(
      () => record(undefined, undefined, [steady, other]),
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
      /loaded is not of the same setup as .*known-work: app build build1 -> build2/
    );
    assert.throws(
      () => record([writeKnownWork('known-work', undefined, { appBuild: '' })]),
      /known-work measured an app without an app build identity/
    );
  });
});

describe('the measurement revision of the sources', () => {
  it('refuses a source of another measurement revision', () => {
    const knownWork = writeKnownWork('known-work', undefined, {
      measurementRevision: IOS_DEFINITION.measurementRevision - 1,
    });
    assert.throws(
      () => record([knownWork]),
      new RegExp(
        `known-work is of the measurement revision ${IOS_DEFINITION.measurementRevision - 1}\\. This driver has the revision ${IOS_DEFINITION.measurementRevision}, and a source of another revision is not validation evidence for it\\.`
      )
    );
  });

  it('keeps an earlier cross-check as history, outside the gates, and refuses one of the present revision', () => {
    const earlier = path.join(SOURCES_DIR, 'earlier');
    fs.mkdirSync(earlier, { recursive: true });
    const value = (app: number, trace: number) => ({
      app,
      trace,
      signedError: app - trace,
      absoluteError: Math.abs(app - trace),
      relativeError: (app - trace) / trace,
      timingUncertainty: 0.009,
      tolerance: 0.02 * trace + 0.009,
      passes: Math.abs(app - trace) <= 0.02 * trace + 0.009,
    });
    fs.writeFileSync(
      path.join(earlier, 'crosscheck.json'),
      JSON.stringify({
        formatVersion: 3,
        measurementRevision: IOS_DEFINITION.measurementRevision - 1,
        scenario: 'worklet-styles-transform',
        epochs: [
          {
            index: 3,
            load: 'steady',
            collector: 'full',
            uiThreadCpu: value(362.494, 355.271),
            jsThreadCpu: value(2.655, 2.637),
            processCpu: value(365.167, 357.925),
          },
        ],
        verdict: { counters: false, loadsRan: true, memory: 'not available' },
      })
    );
    const built = buildValidationRecord(
      {
        knownWorks: [readKnownWorkResult(writeKnownWork('known-work'))],
        observerCosts: [
          readObserverCostResult(writeObserverCost('idle', 'idle-cost')),
          readObserverCostResult(
            writeObserverCost('loaded', 'worklet-styles-transform')
          ),
        ],
        crosschecks: [],
      },
      [readEarlierCrosscheck(earlier)]
    );
    assert.deepEqual(validated(built), { processInstructionRate: true });
    assert.equal(built.earlierCrosschecks[0].result.verdict.counters, false);
    assert.equal(
      built.earlierCrosschecks[0].result.epochs[0].uiThreadCpu.passes,
      false
    );
    assert.deepEqual(readValidationRecord(writeRecord(built)), built);
    assert.throws(
      () => readEarlierCrosscheck(writeCrosscheck('present', STEADY_PLAN)),
      new RegExp(
        `it is of the measurement revision ${IOS_DEFINITION.measurementRevision}, not of an earlier revision than ${IOS_DEFINITION.measurementRevision}`
      )
    );
  });
});

describe('the validation sources', () => {
  it('refuses stored CPU values, windows and timing uncertainties that do not follow from the counter reads', () => {
    const refusal = (
      change: (stored: CrosscheckResult) => CrosscheckResult
    ) => {
      const folder = writeCrosscheck('counters', LOADS_PLAN);
      const file = path.join(folder, 'crosscheck.json');
      fs.writeFileSync(
        file,
        JSON.stringify(change(JSON.parse(fs.readFileSync(file, 'utf8'))))
      );
      try {
        readCrosscheckResult(folder);
        return '';
      } catch (error) {
        return (error as Error).message;
      } finally {
        fs.rmSync(folder, { recursive: true });
      }
    };
    assert.match(
      refusal((stored) => {
        const [first, ...rest] = stored.epochs;
        const app = (first.uiThreadCpu.app ?? 0) + 500;
        return {
          ...stored,
          epochs: [
            {
              ...first,
              uiThreadCpu: {
                ...first.uiThreadCpu,
                app,
                signedError: app - (first.uiThreadCpu.trace ?? 0),
                timingUncertainty: 1000,
                tolerance: 1007,
                passes: true,
              },
            },
            ...rest,
          ],
        };
      }),
      /- crosscheck: epoch 0: the stored uiThreadCpu does not follow from its values/
    );
    assert.match(
      refusal((stored) => {
        const [first, second, ...rest] = stored.appBoundaries;
        return {
          ...stored,
          appBoundaries: [
            first,
            {
              ...second,
              uiReadStartNs: second.uiReadStartNs + 1e9,
              uiReadEndNs: second.uiReadEndNs + 1e9,
            },
            ...rest,
          ],
        };
      }),
      /- crosscheck: Boundary 1 of the SAMPLE line: jsReadStartNs \(\d+ ns\) is before uiReadEndNs/
    );
    assert.match(
      refusal((stored) => ({
        ...stored,
        epochs: stored.epochs.map((epoch) => ({ ...epoch, windowSeconds: 3 })),
      })),
      /- crosscheck: epoch 0: the stored windowSeconds does not follow from its values/
    );
    assert.match(
      refusal((stored) => ({ ...stored, cpuCount: 12 })),
      /- crosscheck: epoch 0: the stored processCpu does not follow from its values/
    );
  });

  it('refuses a cross-check whose boundary offsets, clock mapping or footprint reads do not follow from the stored times', () => {
    const folder = writeCrosscheck('clock', LOADS_PLAN);
    const file = path.join(folder, 'crosscheck.json');
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    const write = (change: object) =>
      fs.writeFileSync(file, JSON.stringify({ ...stored, ...change }));
    const [first, ...rest] = stored.boundaryClocks.boundaries;
    write({
      boundaryClocks: {
        ...stored.boundaryClocks,
        boundaries: [{ ...first, offsetNs: 5 }, ...rest],
      },
    });
    assert.throws(
      () => readCrosscheckResult(folder),
      /- crosscheck: boundary 0: the stored offset 5 ns is not the trace time minus the middle of the app signpost \(0 ns\)/
    );
    write({
      boundaryClocks: {
        ...stored.boundaryClocks,
        boundaries: [{ ...first, traceNs: first.traceNs + 3_000 }, ...rest],
      },
    });
    assert.throws(
      () => readCrosscheckResult(folder),
      /boundary 0: the stored offset 0 ns is not the trace time minus the middle of the app signpost \(3000 ns\)/
    );
    write({ clock: { ...stored.clock, offsetNs: 10_000 } });
    assert.throws(
      () => readCrosscheckResult(folder),
      /boundary 0: its offset 0 ns differs from the mapping \(10000 ns\) by more than its uncertainty \(0 ns\)[\s\S]*the clock mapping \(offset 10000 ns/
    );
    const [boundary, ...others] = stored.appBoundaries;
    write({
      appBoundaries: [
        {
          ...boundary,
          footprintReadStartNs: boundary.footprintReadStartNs - 50,
        },
        ...others,
      ],
    });
    assert.throws(
      () => readCrosscheckResult(folder),
      /footprint 0: the stored comparison does not follow from the app boundary, the clock mapping and its rows/
    );
  });

  it('refuses a cross-check with a refresh rate or a window length that is not positive', () => {
    assert.throws(
      () =>
        readCrosscheckResult(
          writeCrosscheck('zero-rate', LOADS_PLAN, { refreshRate: 0 })
        ),
      /- crosscheck\.refreshRate must be a positive number/
    );
    const zeroWindow = crosscheckEpochs(LOADS_PLAN).map((epoch) => ({
      ...epoch,
      windowSeconds: 0,
      work: { own: 0, other: 0 },
      workProof: {
        own: 0,
        other: 0,
        minimumOwn: 0,
        maximumOther: 0,
        passes: true,
      },
    }));
    assert.throws(
      () =>
        readCrosscheckResult(
          writeCrosscheck('zero-window', LOADS_PLAN, { epochs: zeroWindow })
        ),
      /- crosscheck\.epochs\[0\]\.windowSeconds must be a positive number/
    );
  });

  it('accepts an observer-cost test with a metric at 0 in each sample, and does not validate that metric', () => {
    const folder = writeObserverCost('zero', 'idle-cost');
    const file = path.join(folder, 'observer-cost.json');
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    const samples = stored.samples.map((sample: CollectorSample) => ({
      ...sample,
      processInstructionRate: 0,
    }));
    fs.writeFileSync(
      file,
      JSON.stringify({
        ...stored,
        samples,
        costs: observerCosts(samples, { processInstructionRate: 0.08 }),
      })
    );
    const cost = readObserverCostResult(folder).result.costs?.find(
      ({ metric }) => metric === 'processInstructionRate'
    );
    assert.deepEqual(
      [cost?.relativeDifference, cost?.interval, cost?.outcome],
      [null, null, 'not validated']
    );
    assert.deepEqual(
      validated(
        record(undefined, [
          folder,
          writeObserverCost('loaded', 'worklet-styles-transform'),
        ])
      ),
      { processInstructionRate: false }
    );
  });

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

  it('takes the thermal state of a cross-check from the boundary readings and refuses a summary below one of them', () => {
    const warm = writeCrosscheck('warm', LOADS_PLAN, {
      appBoundaries: warmBoundaries(LOADS_PLAN),
    });
    assert.throws(
      () => readCrosscheckResult(warm),
      /- crosscheck: thermalState is 0, but a boundary reading of the app gives 1$/
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
      /- crosscheck: footprint 0: the stored comparison does not follow from the app boundary, the clock mapping and its rows\n {2}- crosscheck: verdict\.memory is passed, but the epochs and the footprints give failed/
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
      /- observer-cost\.samples\[0\]\.processInstructionRate must be a finite number[\s\S]*- observer-cost\.costs\[0\]\.medianEndpoints must be a finite number/
    );
    const forced = writeObserverCost('forced', 'idle-cost', (metric) =>
      metric === 'memory' ? 'failed' : 'passed'
    );
    const forcedFile = path.join(forced, 'observer-cost.json');
    const result = JSON.parse(fs.readFileSync(forcedFile, 'utf8'));
    result.costs[4].outcome = 'passed';
    fs.writeFileSync(forcedFile, JSON.stringify(result));
    assert.throws(
      () => readObserverCostResult(forced),
      /- observer-cost: the stored cost of memory does not follow from the samples and its noise limit/
    );
  });
});

describe('the known-work source', () => {
  it('reads a known-work test whose epochs and gates follow from its counter reads', () => {
    const { result } = readKnownWorkResult(writeKnownWork('known-work'));
    assert.ok(result.gates.every((gate) => gate.passes));
    const single = result.epochs.find(({ load }) => load === 'known-work');
    const disassembly = result.gates.find(
      ({ name }) =>
        name ===
        '`known-work`: instructions of the load against the count of the disassembly'
    );
    assert.ok(
      Math.abs((single?.loadInstructions ?? 0) - (disassembly?.expected ?? 0)) <
        1
    );
  });

  it('refuses stored epochs, gates or constants that do not follow from the evidence or the driver', () => {
    const refusal = (change: Partial<KnownWorkResult>) => {
      const folder = writeKnownWork('forged', undefined, change);
      try {
        readKnownWorkResult(folder);
        return '';
      } catch (error) {
        return (error as Error).message;
      } finally {
        fs.rmSync(folder, { recursive: true });
      }
    };
    const { result } = readKnownWorkResult(writeKnownWork('known-work'));
    assert.match(
      refusal({
        gates: result.gates.map((gate) => ({ ...gate, passes: true })),
        sampledEpochs: result.sampledEpochs.map((epoch) => ({
          ...epoch,
          work: { own: 0, other: 0 },
        })),
      }),
      /- known-work: the stored field gates does not follow from its evidence/
    );
    assert.match(
      refusal({ instructionsPerUnit: 3_000_000 }),
      /its instruction count for each unit or its tolerance is not the value of this driver/
    );
    assert.match(
      refusal({
        plan: { ...result.plan, epochs: result.plan.epochs.slice(1) },
      }),
      /its plan is not the known-work plan of this driver[\s\S]*its sampled epochs are not its planned epochs/
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
      writeKnownWork('warm', undefined, { reportedThermalState: 1 }),
    ]);
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            metrics: {
              processInstructionRate: {
                ...built.metrics.processInstructionRate,
                validated: true,
              },
            },
          })
        ),
      /is not a valid validation record:\n {2}- validation: the flag of processInstructionRate does not match its gates/
    );
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            metrics: {
              processInstructionRate: { validated: true, gates: [] },
            },
          })
        ),
      /the gates of processInstructionRate do not follow from its sources/
    );
    assert.throws(
      () => readValidationRecord(writeRecord({ ...built, metrics: {} })),
      /it has no entry for processInstructionRate/
    );
    assert.throws(
      () => readValidationRecord(writeRecord({ ...built, appBuild: 1 })),
      /- validation\.appBuild must be a string/
    );
  });

  it('refuses a record whose embedded source was changed after the build', () => {
    const built = record(undefined, undefined, [
      writeCrosscheck('steady', STEADY_PLAN),
      writeCrosscheck('loads', LOADS_PLAN),
    ]);
    const [knownWork] = built.sources.knownWorks;
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            sources: {
              ...built.sources,
              knownWorks: [
                {
                  ...knownWork,
                  result: {
                    ...knownWork.result,
                    gates: knownWork.result.gates.map((gate) => ({
                      ...gate,
                      passes: false,
                    })),
                  },
                },
              ],
            },
          })
        ),
      /- validation\.sources\.knownWorks\[0\]\.result: the stored field gates does not follow from its evidence$/
    );
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
    const warm = {
      ...loads.result,
      appBoundaries: warmBoundaries(LOADS_PLAN),
    };
    assert.throws(
      () =>
        readValidationRecord(
          writeRecord({
            ...built,
            sources: {
              ...built.sources,
              crosschecks: [
                steady,
                { ...loads, sha256: sha256Of(warm), result: warm },
              ],
            },
          })
        ),
      /- validation\.sources\.crosschecks\[1\]\.result: thermalState is 0, but a boundary reading of the app gives 1$/
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
              knownWorks: [
                built.sources.knownWorks[0],
                built.sources.knownWorks[0],
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
        metric === 'processInstructionRate' ? 'failed' : 'passed'
      ),
    ]);
    assert.deepEqual(metricValidity(built, IDENTITY, METRICS, {}), {
      validated: [],
      reason: 'the validation record does not validate processInstructionRate',
    });
    assert.deepEqual(
      metricValidity(
        {
          ...built,
          metrics: { processInstructionRate: { validated: true, gates: [] } },
        },
        IDENTITY,
        METRICS,
        {}
      ).validated,
      []
    );
    assert.deepEqual(metricValidity(record(), IDENTITY, METRICS, {}), {
      validated: ['processInstructionRate'],
      reason: null,
    });
  });

  it('checks the observer cost against the noise limits of the run', () => {
    const built = record(undefined, [
      writeObserverCost('idle', 'idle-cost'),
      writeObserverCost('loaded', 'worklet-styles-transform', (metric) =>
        metric === 'processInstructionRate' ? 'failed' : 'passed'
      ),
    ]);
    assert.deepEqual(
      metricValidity(built, IDENTITY, METRICS, {
        'worklet-styles-transform': { processInstructionRate: 0.2 },
      }).validated,
      ['processInstructionRate']
    );
    assert.deepEqual(
      metricValidity(record(), IDENTITY, METRICS, {
        'idle-cost': { processInstructionRate: 0.02 },
      }).validated,
      ['processInstructionRate']
    );
  });

  it('validates no metric without a record or for another setup', () => {
    const built = record();
    assert.deepEqual(metricValidity(null, IDENTITY, METRICS, {}), {
      validated: [],
      reason: 'the run has no validation record',
    });
    assert.deepEqual(metricValidity(built, null, METRICS, {}), {
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
        METRICS,
        {}
      ),
      {
        validated: [],
        reason:
          'the validation record does not fit the run: OS build 24A446 -> 24B1, app build build1 -> build2',
      }
    );
  });
});
