import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as syncMixedTransaction from '../../../docs/tutorials/_synchronizing-data/syncMixedTransaction';
import { simulate } from '..';
import { snippetSource } from './helpers';

describe('Synchronizable lock', () => {
  const snapshots = simulate(
    syncMixedTransaction,
    snippetSource('syncMixedTransaction'),
    { durationTicks: 200 }
  );

  it('runs the transaction snippet without errors', () => {
    assert.deepEqual(
      snapshots
        .flatMap((snapshot) => snapshot.events)
        .filter((event) => event.type === 'error'),
      []
    );
  });

  it('shows the lock holder on the Synchronizable', () => {
    assert.ok(
      snapshots.some((snapshot) =>
        snapshot.memory.some(
          (cell) => cell.kind === 'synchronizable' && cell.lockedBy === 'ui'
        )
      )
    );
  });

  it('blocks getBlocking on another thread while the lock is held', () => {
    const blocked = snapshots.filter((snapshot) =>
      snapshot.cores.some(
        (core) => core.id === 'rn' && core.waitingFor === 'Synchronizable lock'
      )
    );
    assert.ok(blocked.length > 0);
    for (const snapshot of blocked) {
      const cell = snapshot.memory.find(
        (memory) => memory.kind === 'synchronizable'
      );
      assert.equal(cell?.lockedBy, 'ui');
    }
  });
});
