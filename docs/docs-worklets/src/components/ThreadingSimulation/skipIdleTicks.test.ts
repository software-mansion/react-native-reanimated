import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as uiFrames from '../../../docs/tutorials/_using-event-loop/uiFrames';
import { snippetSource } from '../../simulation/__tests__/helpers';
import type { Snapshot } from '../../simulation';
import { collectConsoleEntries } from './consoleEntries';
import { Session } from './useSimulation';

describe('skipIdleTicks', () => {
  it('records idle ticks by default', () => {
    const snapshots = run(false);
    assert.ok(snapshots.slice(1).some(isIdle));
  });

  it('skips ticks in which every core is idle and nothing happens', () => {
    const recorded = run(false);
    const skipped = run(true);
    assert.equal(skipped.slice(1).filter(isIdle).length, 0);
    assert.deepEqual(
      skipped.flatMap((snapshot) => snapshot.events),
      recorded.flatMap((snapshot) => snapshot.events)
    );
    assert.ok(skipped.length < recorded.length);
  });

  it('numbers the remaining ticks by their position', () => {
    const skipped = run(true);
    assert.deepEqual(
      skipped.map((snapshot) => snapshot.tick),
      skipped.map((_, index) => index)
    );
  });

  it('shows every log in the console', () => {
    const recorded = run(false);
    const skipped = run(true);
    const texts = (snapshots: Snapshot[]) =>
      collectConsoleEntries(snapshots, snapshots.length).map(
        (entry) => entry.text
      );
    assert.ok(texts(recorded).length > 0);
    assert.deepEqual(texts(skipped), texts(recorded));
  });
});

function run(skipIdleTicks: boolean): Snapshot[] {
  const session = new Session(uiFrames, snippetSource('uiFrames'), {
    bundleMode: false,
    uiRuntime: true,
    screen: undefined,
    skipTicks: 0,
    bootTicks: 0,
    durationTicks: undefined,
    skipIdleTicks,
  });
  while (session.advance()) {}
  return session.snapshots;
}

function isIdle(snapshot: Snapshot): boolean {
  return (
    !snapshot.finished &&
    snapshot.events.length === 0 &&
    snapshot.cores.every((core) => core.status === 'idle')
  );
}
