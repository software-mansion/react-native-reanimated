import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Expectation } from '../config.mts';
import { evaluateExpectations, exitCodeOf } from '../expectations.mts';
import type { ComparedMetric } from '../metrics.mts';
import type { Scenario } from '../scenarios.mts';
import type { FailedScenario } from '../session.mts';
import type { Verdict, VerdictRow } from '../verdict.mts';

function row(
  scenario: Scenario,
  metric: ComparedMetric,
  verdict: Verdict,
  difference: number,
  low: number,
  high: number
): VerdictRow {
  return {
    scenario,
    metric,
    samplesA: 10,
    samplesB: 10,
    medianA: 100,
    medianB: 100 * (1 + difference),
    comparison: 'relative',
    comparisonFallback: false,
    difference,
    interval: { low, high },
    pValue: 0.001,
    passesFalseDiscovery: true,
    noiseLimit: 0,
    verdict,
  };
}

const ROWS = [
  row('css', 'uiThreadCpu', 'better', -0.31, -0.33, -0.29),
  row('css', 'coldStart', 'no change found', 0.01, -0.02, 0.04),
  row('sticky-header', 'frameDurationP95', 'worse', 0.06, 0.03, 0.09),
  row('sticky-header', 'uiThreadCpu', 'better', -0.05, -0.08, -0.02),
];

function evaluate(
  expectation: Partial<Expectation>,
  failed: FailedScenario[] = []
) {
  const full: Expectation = {
    scenarios: ['css', 'sticky-header'],
    metrics: ['uiThreadCpu', 'coldStart', 'frameDurationP95'],
    is: 'notWorse',
    ...expectation,
  };
  return evaluateExpectations([full], ROWS, failed)[0];
}

describe('evaluateExpectations', () => {
  it('notWorse fails when a selected row is worse', () => {
    const result = evaluate({});
    assert.equal(result.status, 'fails');
    assert.deepEqual(
      result.decidingRows.map((deciding) => deciding.metric),
      ['frameDurationP95']
    );
  });

  it('notWorse holds when no selected row is worse', () => {
    assert.equal(evaluate({ scenarios: ['css'] }).status, 'holds');
  });

  it('better holds when each selected row is better', () => {
    assert.equal(
      evaluate({ is: 'better', metrics: ['uiThreadCpu'] }).status,
      'holds'
    );
  });

  it('better is not decided when a selected row shows no change', () => {
    const result = evaluate({ is: 'better', scenarios: ['css'] });
    assert.equal(result.status, 'not decided');
    assert.deepEqual(
      result.decidingRows.map((deciding) => deciding.metric),
      ['coldStart']
    );
  });

  it('better by at least a fraction holds only when the full interval is beyond it', () => {
    const selection = {
      is: 'better' as const,
      scenarios: ['css' as const],
      metrics: ['uiThreadCpu' as const],
    };
    assert.equal(evaluate({ ...selection, byAtLeast: 0.25 }).status, 'holds');
    assert.equal(
      evaluate({ ...selection, byAtLeast: 0.3 }).status,
      'not decided'
    );
    assert.equal(evaluate({ ...selection, byAtLeast: 0.4 }).status, 'fails');
  });

  it('fails when a selected scenario failed on B', () => {
    const failed: FailedScenario[] = [
      { scenario: 'css', variants: ['b'], causes: [] },
    ];
    assert.equal(evaluate({ scenarios: ['css'] }, failed).status, 'fails');
  });

  it('is not decided when a selected scenario failed only on A', () => {
    const failed: FailedScenario[] = [
      { scenario: 'css', variants: ['a'], causes: [] },
    ];
    assert.equal(
      evaluate({ scenarios: ['css'] }, failed).status,
      'not decided'
    );
  });

  it('is not decided when a selected scenario has no data', () => {
    const [result] = evaluateExpectations(
      [{ scenarios: ['css'], metrics: ['uiThreadCpu'], is: 'better' }],
      ROWS.filter((candidate) => candidate.scenario === 'css'),
      [],
      ['css']
    );
    assert.equal(result.status, 'not decided');
    assert.deepEqual(result.scenariosWithoutData, ['css']);
  });

  it('still fails on a worse row when another selected scenario has no data', () => {
    const [result] = evaluateExpectations(
      [
        {
          scenarios: ['css', 'sticky-header'],
          metrics: ['frameDurationP95'],
          is: 'notWorse',
        },
      ],
      ROWS,
      [],
      ['css']
    );
    assert.equal(result.status, 'fails');
  });

  it('ignores a failed scenario that it does not select', () => {
    const failed: FailedScenario[] = [
      { scenario: 'idle-cost', variants: ['b'], causes: [] },
    ];
    assert.equal(evaluate({ scenarios: ['css'] }, failed).status, 'holds');
  });
});

describe('exitCodeOf', () => {
  it('gives 0 only when all entries hold', () => {
    assert.equal(exitCodeOf([evaluate({ scenarios: ['css'] })]), 0);
    assert.equal(
      exitCodeOf([evaluate({ scenarios: ['css'] }), evaluate({})]),
      1
    );
  });
});
