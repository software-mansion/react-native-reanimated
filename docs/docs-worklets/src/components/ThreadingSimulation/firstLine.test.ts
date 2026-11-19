import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as uiFrames from '../../../docs/tutorials/_using-event-loop/uiFrames';
import * as workerInterval from '../../../docs/tutorials/_using-event-loop/workerInterval';
import { snippetSource } from '../../simulation/__tests__/helpers';
import type { SnippetModule } from '../../simulation';
import { Session } from './useSimulation';

describe('Session.firstLine', () => {
  for (const [name, module] of [
    ['uiFrames', uiFrames],
    ['workerInterval', workerInterval],
  ] as const) {
    it(`matches the first line that executes in ${name}`, () => {
      const session = create(module, name);
      assert.notEqual(session.firstLine, null);
      while (session.advance()) {
        const core = session.snapshots
          .at(-1)!
          .cores.find((candidate) => candidate.line !== null);
        if (core !== undefined) {
          assert.equal(session.firstLine, core.line);
          return;
        }
      }
      assert.fail('no line executed');
    });
  }
});

function create(module: SnippetModule, name: string): Session {
  return new Session(module, snippetSource(name), {
    bundleMode: false,
    uiRuntime: true,
    screen: undefined,
    skipTicks: 0,
    bootTicks: 0,
    durationTicks: undefined,
    skipIdleTicks: false,
  });
}
