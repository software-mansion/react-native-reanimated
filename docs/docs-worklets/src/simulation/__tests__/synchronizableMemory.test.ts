import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as dynamic from '../../../docs/tutorials/_synchronizing-data/syncSynchronizable';
import * as fixed from '../../../docs/tutorials/_synchronizing-data/syncSynchronizableFixed';
import { simulate } from '..';
import type { MemorySnapshot, SnippetModule } from '../types';
import { snippetSource } from './helpers';

describe('Synchronizable memory snapshot', () => {
  it('marks a Synchronizable without fixedType as dynamic and reports its value type', () => {
    const cell = lastSynchronizable(dynamic, 'syncSynchronizable');
    assert.equal(cell.fixed, false);
    assert.equal(cell.valueType, 'number');
  });

  it('marks a Synchronizable with fixedType as fixed', () => {
    const cell = lastSynchronizable(fixed, 'syncSynchronizableFixed');
    assert.equal(cell.fixed, true);
    assert.equal(cell.valueType, 'number');
  });
});

function lastSynchronizable(
  module: SnippetModule,
  name: string
): MemorySnapshot {
  const snapshots = simulate(module, snippetSource(name), {
    durationTicks: 60,
  });
  const cell = snapshots
    .flatMap((snapshot) => snapshot.memory)
    .filter((memory) => memory.kind === 'synchronizable')
    .at(-1);
  assert.ok(cell !== undefined);
  return cell;
}
