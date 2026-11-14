import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import type { RunConfig, Variant } from '../config.mts';
import type { SampleMetrics } from '../metrics.mts';
import {
  NOISE_LIMIT_FLOORS,
  computeNoiseLimits,
  noiseLimitsCommand,
  splitNoise,
} from '../noise-limits.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import { writeResult } from '../results.mts';
import type { RunResult } from '../results.mts';
import type { Scenario } from '../scenarios.mts';
import type { SampleRecord, ScenarioOutcome } from '../session.mts';

const ROOT = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `noise-limits-${process.pid}`
);

after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

const VARIANT: Variant = {
  reanimated: { kind: 'npm', version: '4.7.1' },
  worklets: { kind: 'npm', version: '0.13.1' },
  reanimatedFlags: {},
  workletsFlags: {},
  bundleMode: false,
  profiling: false,
};

function outcome(
  scenario: Scenario,
  metricsOf: (variant: 'a' | 'b', i: number) => Partial<SampleMetrics>
): ScenarioOutcome {
  const samples = (['a', 'b'] as const).flatMap((variant) =>
    Array.from(
      { length: 10 },
      (_, i) =>
        ({
          scenario,
          variant,
          block: Math.floor(i / 2),
          attempt: 0,
          position: 0,
          batteryLevel: 80,
          accepted: true,
          valid: true,
          timings: {},
          metrics: {
            frameDurationMedian: 10,
            frameDurationP95: 12,
            jankyFrames: 0.001,
            uiThreadCpu: 100,
            jsThreadCpu: 50,
            memory: 100000,
            windowMemoryDelta: 0,
            coldStart: 300,
            ...metricsOf(variant, i),
          },
        }) as SampleRecord
    )
  );
  return { scenario, samples, failed: null };
}

function writeRun(
  name: string,
  outcomes: ScenarioOutcome[],
  b: Variant = VARIANT
): string {
  const folder = runFolder(name);
  writeResult(folder, runResult(name, outcomes, b));
  return folder;
}

function runFolder(name: string): string {
  const folder = path.join(ROOT, name);
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

function runResult(
  name: string,
  outcomes: ScenarioOutcome[],
  b: Variant = VARIANT
): RunResult {
  const config: RunConfig = {
    name,
    a: VARIANT,
    b,
    scenarios: outcomes.map((item) => item.scenario),
    expect: [],
  };
  return {
    formatVersion: 3,
    platform: 'android',
    command: 'run',
    status: 'tool error',
    startedAt: '2026-11-12T10:00:00.000Z',
    config,
    options: { blocks: 5, noiseLimitsFile: null, keepTraces: false },
    noiseLimits: null,
    serial: 'SERIAL1',
    segments: [],
    appRefreshRate: 60,
    variants: {},
    scenarios: outcomes,
    incompleteScenario: outcome('idle-cost', () => ({ uiThreadCpu: 900 })),
    abandonedScenarios: [],
    statistics: [],
    expectations: [],
  };
}

function printed(runs: string[]): unknown {
  const lines: string[] = [];
  const log = console.log;
  console.log = (line: string) => void lines.push(line);
  try {
    assert.equal(noiseLimitsCommand({ command: 'noise-limits', runs }), 0);
  } finally {
    console.log = log;
  }
  return JSON.parse(lines.join('\n'));
}

describe('splitNoise', () => {
  it('takes the 97.5th percentile of the absolute difference over all splits', () => {
    assert.equal(splitNoise([1, 2], [3, 4], 'absolute'), 2);
    assert.ok(
      Math.abs((splitNoise([1, 2], [3, 4], 'relative') ?? 0) - 26 / 21) < 1e-12
    );
  });

  it('gives no limit when the relative difference is not defined', () => {
    assert.equal(splitNoise([0, 0, 1], [1, 1, 1], 'relative'), null);
    assert.equal(splitNoise([0, 0, 1], [1, 1, 1], 'absolute'), 1);
  });

  it('gives no limit with random splits when one split has no relative difference', () => {
    const zeros = new Array<number>(21).fill(0);
    const ones = new Array<number>(19).fill(1);
    const b = new Array<number>(40).fill(1);
    assert.equal(splitNoise([...zeros, ...ones], b, 'relative'), null);
  });

  it('gives the same limit each time with random splits', () => {
    const a = Array.from({ length: 20 }, (_, i) => 100 + i);
    const b = a.map((value) => value + 0.5);
    const limit = splitNoise(a, b, 'relative');
    assert.equal(splitNoise(a, b, 'relative'), limit);
    assert.ok(limit !== null && limit > 0 && limit < 0.1);
  });
});

describe('computeNoiseLimits', () => {
  it('applies the floors and gives no limit for windowMemoryDelta', () => {
    const limits = computeNoiseLimits([
      outcome('css', () => ({})),
      outcome('mount-unmount', (_variant, i) => ({
        windowMemoryDelta: i * 3000,
      })),
    ]);
    const floors = {
      frameDurationMedian: NOISE_LIMIT_FLOORS.frameDurationMedian,
      frameDurationP95: 0.02,
      jankyFrames: 0.005,
      uiThreadCpu: 0.02,
      jsThreadCpu: 0.02,
      memory: 0.02,
      coldStart: 0.02,
    };
    assert.deepEqual(limits.css, floors);
    assert.deepEqual(limits['mount-unmount'], floors);
  });

  it('leaves out a relative metric whose median can be 0', () => {
    const limits = computeNoiseLimits([
      outcome('css', (_variant, i) => ({ coldStart: i < 6 ? 0 : 300 })),
    ]);
    assert.equal(limits.css?.coldStart, undefined);
  });
});

describe('noiseLimitsCommand', () => {
  it('prints the limits of the complete scenarios of A/A runs', () => {
    const first = writeRun('aa-1', [outcome('css', () => ({}))]);
    const second = writeRun('aa-2', [outcome('sticky-header', () => ({}))]);
    const limits = printed([first, second]) as Record<string, unknown>;
    assert.deepEqual(Object.keys(limits), ['css', 'sticky-header']);
  });

  it('reads a run of result format 1 with memoryGrowth', () => {
    const folder = runFolder('format-1');
    const { command: _command, ...current } = runResult('format-1', [
      outcome('mount-unmount', () => ({})),
    ]);
    const stored = JSON.stringify({ ...current, formatVersion: 1 }).replaceAll(
      '"windowMemoryDelta"',
      '"memoryGrowth"'
    );
    fs.writeFileSync(path.join(folder, 'result.json'), stored);
    const limits = printed([folder]) as Record<string, object>;
    assert.equal(Object.keys(limits['mount-unmount']).length, 7);
  });

  it('refuses a run that is not A/A', () => {
    const folder = writeRun('ab', [outcome('css', () => ({}))], {
      ...VARIANT,
      profiling: true,
    });
    assert.throws(
      () => noiseLimitsCommand({ command: 'noise-limits', runs: [folder] }),
      /is not an A\/A run\. A and B differ in: profiling/
    );
  });

  it('refuses a scenario in two runs', () => {
    const first = writeRun('twice-1', [outcome('css', () => ({}))]);
    const second = writeRun('twice-2', [outcome('css', () => ({}))]);
    assert.throws(
      () =>
        noiseLimitsCommand({ command: 'noise-limits', runs: [first, second] }),
      /The scenario css is in two runs/
    );
  });
});
