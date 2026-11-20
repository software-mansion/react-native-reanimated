import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLogs, simulate } from '../index';
import { cloneArguments } from '../serialization';
import { asModule } from './helpers';
import {
  createSerializable,
  isSerializableRef,
  runOnUISync,
  scheduleOnUI,
} from '../worklets';

describe('Serializable references', () => {
  it('creates an opaque, reusable reference to one immutable native value', () => {
    function* main() {
      const source = yield { volume: 10 };
      const reference = yield createSerializable(source);
      const again = yield createSerializable(source);
      const alreadySerialized = yield createSerializable(reference);
      yield console.log(
        isSerializableRef(source),
        isSerializableRef(reference),
        reference === again,
        reference === alreadySerialized,
        Object.isFrozen(reference),
        reference.__nativeStateSerializableJSRef
      );
    }
    const snapshots = simulate(asModule({ default: main }), main.toString());
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] false true true true true undefined',
    ]);
    assert.equal(snapshots.at(-1)!.memory.length, 1);
    assert.equal(snapshots.at(-1)!.memory[0].value, '{"volume":10}');
  });

  it('reconstructs nested references independently on each cross-runtime call', () => {
    function* change(input: { settings: { volume: number } }) {
      yield console.log(input.settings.volume);
      yield (input.settings.volume = 20);
    }
    function* main() {
      const reference = yield createSerializable({ volume: 10 });
      yield runOnUISync(change, { settings: reference });
      yield runOnUISync(change, { settings: reference });
    }
    const snapshots = simulate(
      asModule({ default: main, change }),
      `${main.toString()}\n${change.toString()}`
    );
    assert.deepEqual(formatLogs(snapshots), ['[rn] 10', '[rn] 10']);
    assert.equal(snapshots.at(-1)!.memory[0].value, '{"volume":10}');
  });

  it('preserves an undefined Serializable value when passing it to UI', () => {
    function* read(value: unknown) {
      yield console.log(value);
    }
    function* main() {
      const reference = yield createSerializable(undefined);
      yield scheduleOnUI(read, reference);
    }
    const snapshots = simulate(
      asModule({ default: main, read }),
      `${main.toString()}\n${read.toString()}`
    );
    assert.deepEqual(formatLogs(snapshots), ['[ui] undefined']);
    assert.equal(snapshots.at(-1)!.memory[0].value, 'undefined');
  });

  it('keeps existing structured-clone behavior for data without references', () => {
    const shared = { volume: 10 };
    const input = {
      values: [shared, shared],
      map: new Map([['settings', shared]]),
      set: new Set([shared]),
      date: new Date('2026-01-01T00:00:00Z'),
      bytes: new Uint8Array([1, 2, 3]),
    };
    const [copy] = cloneArguments([input], () => undefined) as [typeof input];
    assert.deepEqual(copy, input);
    assert.notEqual(copy.values[0], shared);
    assert.equal(copy.values[0], copy.values[1]);
    assert.equal(copy.map.get('settings'), copy.values[0]);
    copy.values[0].volume = 20;
    assert.equal(shared.volume, 10);
    assert.throws(
      () => cloneArguments([() => 1], () => undefined),
      /must be serializable/
    );
  });
});
