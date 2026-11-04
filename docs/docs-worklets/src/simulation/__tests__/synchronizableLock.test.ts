import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import * as syncMixedTransaction from '../../../docs/tutorials/_synchronizing-data/syncMixedTransaction';
import { formatLogs, simulate } from '..';
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

  it('writes the progress and lets the RN Runtime read every value', () => {
    const hosted = snapshots
      .flatMap((snapshot) => snapshot.memory)
      .filter((cell) => cell.kind === 'shareable')
      .map((cell) => cell.value);
    assert.ok(hosted.includes('100'));
    const logs = formatLogs(snapshots);
    assert.ok(logs.includes('[rn] progress 100%'));
    assert.ok(logs.some((log) => log.startsWith('[rn] progress 25%')));
  });
});

describe('blocked Synchronizable writes', () => {
  it('runs an updater that reads another Synchronizable after the lock is released', () => {
    const path = join(__dirname, '_fixtures', 'lockedUpdater.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const snapshots = simulate(require(path), readFileSync(path, 'utf8'));
    const events = snapshots.flatMap((snapshot) => snapshot.events);
    assert.deepEqual(
      events.filter((event) => event.type === 'error'),
      []
    );
    assert.ok(formatLogs(snapshots).includes('[rn] counter 5'));
    assert.ok(
      snapshots.some((snapshot) =>
        snapshot.cores.some(
          (core) =>
            core.id === 'rn' && core.waitingFor === 'Synchronizable lock'
        )
      )
    );
  });
});
