import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { simulate } from '../index';
import { beginRender, resetHooks, useState } from '../react';
import { runOnUISync, scheduleOnRN, scheduleOnUI } from '../worklets';
import { asModule, unindent } from './helpers';

describe('React state ownership', () => {
  for (const mode of ['direct', 'callback', 'ui', 'sync-ui'] as const) {
    it(`checks the active runtime for a ${mode} state update`, () => {
      resetHooks();
      let setState: (value: number) => void;
      function* updateState() {
        yield setState(42);
      }
      function* callback() {
        yield scheduleOnRN(updateState);
      }
      const invoke = () => {
        switch (mode) {
          case 'direct':
            return updateState();
          case 'callback':
            return scheduleOnUI(callback);
          case 'ui':
            return scheduleOnUI(updateState);
          case 'sync-ui':
            return runOnUISync(updateState);
        }
      };
      function* main() {
        [, setState] = useState(0);
        yield invoke();
      }
      const snapshots = simulate(
        asModule({ default: main, updateState, callback }),
        unindent(`
          export function* updateState() {
            yield setState(42);
          }
          export function* callback() {
            yield scheduleOnRN(updateState);
          }
          export default function* main() {
            [, setState] = useState(0);
            yield invoke();
          }
        `)
      );
      const errors = snapshots.flatMap((snapshot) =>
        snapshot.events.filter((event) => event.type === 'error')
      );
      const shouldFail = mode === 'ui' || mode === 'sync-ui';
      assert.equal(errors.length, shouldFail ? 1 : 0);
      if (shouldFail) {
        assert.equal(errors[0].core, mode === 'ui' ? 'ui' : 'rn');
        assert.match(errors[0].message, /Called "setState" on the UI Runtime/);
      }
      beginRender();
      assert.equal(useState(0)[0], shouldFail ? 0 : 42);
    });
  }
});
