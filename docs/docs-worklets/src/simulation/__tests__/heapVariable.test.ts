import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as syncCallbacks from '../../../docs/tutorials/_synchronizing-data/syncCallbacks';
import * as syncPeriodic from '../../../docs/tutorials/_synchronizing-data/syncPeriodic';
import { displaySource, simulate } from '..';
import { snippetSource } from './helpers';

describe('heapVariable', () => {
  it('shows a heap variable as a plain variable in the displayed code', () => {
    const { text } = displaySource(snippetSource('syncPeriodic'));
    assert.match(text, /^\s*let result = -1;$/m);
    assert.match(text, /^\s*result\+\+;$/m);
    assert.doesNotMatch(text, /heapVariable|result\.value/);
  });

  it('keeps the variable in the JS heap of the runtime that declares it', () => {
    const snapshots = simulate(syncPeriodic, snippetSource('syncPeriodic'), {
      durationTicks: 120,
    });
    const cells = snapshots
      .flatMap((snapshot) => snapshot.memory)
      .filter((cell) => cell.kind === 'variable');
    assert.ok(cells.length > 0);
    assert.ok(cells.every((cell) => cell.name === 'result'));
    assert.ok(cells.every((cell) => cell.host !== null && cell.host !== 'rn'));
    const values = new Set(cells.map((cell) => cell.value));
    assert.ok(values.size > 3);
  });

  it('tracks the worker result in SD-2 and shows it as a plain variable', () => {
    const { text } = displaySource(snippetSource('syncCallbacks'));
    assert.match(text, /^\s*let result = -1;$/m);
    assert.match(text, /^\s*scheduleOnRN\(pollResult, result\);$/m);
    assert.match(text, /^let polledResult = -1;$/m);
    assert.match(text, /^\s*polledResult = value;$/m);
    assert.match(text, /^\s*console\.log\(polledResult\);$/m);
    const cells = simulate(syncCallbacks, snippetSource('syncCallbacks'), {
      durationTicks: 120,
    })
      .flatMap((snapshot) => snapshot.memory)
      .filter((cell) => cell.kind === 'variable');
    const result = cells.filter((cell) => cell.name === 'result');
    const polled = cells.filter((cell) => cell.name === 'polledResult');
    assert.ok(result.every((cell) => cell.host === 'worker:worker'));
    assert.ok(polled.every((cell) => cell.host === 'rn'));
    assert.ok(new Set(result.map((cell) => cell.value)).size > 3);
    assert.ok(new Set(polled.map((cell) => cell.value)).size > 3);
  });
});
