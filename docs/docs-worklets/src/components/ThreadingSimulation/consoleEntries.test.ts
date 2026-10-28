import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as crash from '../../../docs/tutorials/_returning-results/returningCallbackCrash';
import * as direct from '../../../docs/tutorials/_returning-results/returningDirect';
import { simulate } from '../../simulation';
import { snippetSource } from '../../simulation/__tests__/helpers';
import { collectConsoleEntries } from './consoleEntries';

describe('simulation console', () => {
  it('shows the actual error on the failing tick without revealing it earlier', () => {
    const snapshots = simulate(crash, snippetSource('returningCallbackCrash'));
    const last = snapshots[snapshots.length - 1];
    const error = last.events.find((event) => event.type === 'error')!;
    assert.deepEqual(collectConsoleEntries(snapshots, last.tick - 1), []);
    assert.deepEqual(collectConsoleEntries(snapshots, last.tick), [
      {
        core: 'worker:worker',
        level: 'error',
        text: error.message,
        tick: last.tick,
      },
    ]);
  });

  it('keeps one error at the final playback step and clears it when rewound', () => {
    const snapshots = simulate(crash, snippetSource('returningCallbackCrash'));
    const last = snapshots[snapshots.length - 1];
    snapshots.push({ ...last, tick: last.tick + 1, events: [] });
    assert.equal(collectConsoleEntries(snapshots, last.tick + 1).length, 1);
    assert.deepEqual(collectConsoleEntries(snapshots, 0), []);
  });

  it('preserves the one-tick delay for ordinary console logs', () => {
    const snapshots = simulate(direct, snippetSource('returningDirect'));
    const last = snapshots[snapshots.length - 1];
    assert.deepEqual(collectConsoleEntries(snapshots, last.tick), []);
    assert.deepEqual(collectConsoleEntries(snapshots, last.tick + 1), [
      {
        core: 'rn',
        level: 'log',
        text: '42',
        tick: last.tick,
      },
    ]);
  });
});
