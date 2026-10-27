import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLogs, simulate } from '../index';
import {
  CustomSerializerRegistry,
  packArguments,
  previewArguments,
  unpackArguments,
} from '../serialization';
import {
  createSerializable,
  createWorkletRuntime,
  globalThis as runtimeGlobal,
  registerCustomSerializable,
  runOnUISync,
  scheduleOnRuntime,
  scheduleOnUI,
} from '../worklets';
import { asModule } from './helpers';

interface Point {
  x: number;
  y: number;
  length(): number;
}

function point(x: number, y: number): Point {
  return Object.assign(
    Object.create({
      kind: 'Point',
      length(this: Point) {
        return Math.hypot(this.x, this.y);
      },
    }),
    { x, y }
  );
}

const registration = {
  name: 'Point',
  determine(value: object) {
    'worklet';
    return Object.getPrototypeOf(value)?.kind === 'Point';
  },
  pack(value: Point) {
    'worklet';
    return { x: value.x, y: value.y };
  },
  unpack(value: { x: number; y: number }) {
    'worklet';
    return point(value.x, value.y);
  },
};

describe('Custom Serializables', () => {
  it('packs on RN and unpacks under the worker lock with its own globals', () => {
    function* initialize() {
      'worklet';
      yield (runtimeGlobal.location = 'worker');
    }
    function* read(value: Point) {
      'worklet';
      yield console.log('length', value.length());
      yield (value.x = 100);
    }
    function* main() {
      yield (runtimeGlobal.location = 'RN');
      const worker = yield createWorkletRuntime({
        name: 'background',
        initializer: initialize,
      });
      yield registerCustomSerializable({
        ...registration,
        pack(value: Point) {
          'worklet';
          console.log('pack', runtimeGlobal.location);
          return registration.pack(value);
        },
        unpack(value: { x: number; y: number }) {
          'worklet';
          console.log('unpack', runtimeGlobal.location);
          return registration.unpack(value);
        },
      });
      const source = yield point(3, 4);
      yield scheduleOnRuntime(worker, read, source);
      yield (source.x = 6);
      yield console.log('source', source.x);
    }
    const snapshots = simulate(
      asModule({ default: main, read, initialize }),
      [main, read, initialize].map(String).join('\n')
    );
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] pack RN',
      '[worker:background] unpack worker',
      '[worker:background] length 5',
      '[rn] source 6',
    ]);
    const unpacked = snapshots.find((snapshot) =>
      snapshot.events.some(
        (event) => event.type === 'log' && event.text === 'unpack worker'
      )
    )!;
    assert.equal(
      unpacked.resources.find(
        (resource) =>
          resource.kind === 'runtime' && resource.id === 'worker:background'
      )?.holder,
      'worker:background'
    );
    assert.equal(snapshots.at(-1)!.finished, true);
  });

  it('packs a Serializable once and reconstructs independent copies without invoking callbacks for snapshots', () => {
    function* read(value: Point) {
      'worklet';
      yield console.log(value.length());
      yield (value.x = 100);
    }
    function* main() {
      yield registerCustomSerializable({
        ...registration,
        pack(value: Point) {
          'worklet';
          console.log('pack');
          return registration.pack(value);
        },
        unpack(value: { x: number; y: number }) {
          'worklet';
          console.log('unpack');
          return registration.unpack(value);
        },
      });
      const source = yield point(3, 4);
      const reference = yield createSerializable(source);
      yield console.log(reference === createSerializable(source));
      yield (source.x = 6);
      yield scheduleOnUI(read, reference);
      yield scheduleOnUI(read, reference);
    }
    const snapshots = simulate(
      asModule({ default: main, read }),
      [main, read].map(String).join('\n')
    );
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] pack',
      '[rn] true',
      '[ui] unpack',
      '[ui] 5',
      '[ui] unpack',
      '[ui] 5',
    ]);
    assert.equal(snapshots.at(-1)!.memory[0].value, '{"x":3,"y":4}');
  });

  it('preserves nested aliases and reconstructs a new prototype for each destination', () => {
    const registry = new CustomSerializerRegistry();
    registry.register(registration);
    const original = point(3, 4);
    const input = {
      array: [original, original],
      map: new Map([[original, original]]),
      set: new Set([original]),
    };
    const packet = packArguments([input], () => undefined, registry);
    const decode = () =>
      unpackArguments(packet, (name, value) =>
        registry.unpack(name, value)
      )[0] as typeof input;
    const first = decode();
    const second = decode();
    assert.equal(first.array[0].length(), 5);
    assert.equal(first.array[0], first.array[1]);
    assert.equal(first.map.get(first.array[0]), first.array[0]);
    assert.ok(first.set.has(first.array[0]));
    assert.notEqual(
      Object.getPrototypeOf(first.array[0]),
      Object.getPrototypeOf(original)
    );
    first.array[0].x = 100;
    assert.equal(second.array[0].length(), 5);
    assert.equal(original.length(), 5);
    assert.equal(packet.custom.size, 1);
    assert.equal(
      typeof (previewArguments(packet)[0] as typeof input).array[0].length,
      'undefined'
    );
  });

  it('keeps the first registration and rejects callbacks without a worklet directive', () => {
    const registry = new CustomSerializerRegistry();
    registry.register(registration);
    registry.register({
      ...registration,
      unpack() {
        'worklet';
        return point(0, 0);
      },
    });
    const packet = packArguments([point(3, 4)], () => undefined, registry);
    const [copy] = unpackArguments(packet, (name, value) =>
      registry.unpack(name, value)
    ) as Point[];
    assert.equal(copy.length(), 5);
    assert.throws(
      () =>
        registry.register({
          ...registration,
          pack: (value: Point) => ({ x: value.x, y: value.y }),
        }),
      /must be a worklet/
    );
  });

  it('rejects registration outside RN and does not leak registrations between simulations', () => {
    function* register() {
      'worklet';
      yield registerCustomSerializable(registration);
    }
    function* main() {
      yield scheduleOnUI(register);
    }
    const invalid = simulate(
      asModule({ default: main, register }),
      [main, register].map(String).join('\n')
    );
    assert.match(
      invalid.at(-1)!.cores.find((core) => core.id === 'ui')!.error!,
      /only on React Native/
    );
    function* read(value: Point) {
      yield console.log(value.length());
    }
    function* unregistered() {
      yield scheduleOnUI(read, point(3, 4));
    }
    const isolated = simulate(
      asModule({ default: unregistered, read }),
      `${unregistered.toString().replace('unregistered', 'main')}\n${read}`
    );
    assert.match(
      isolated.at(-1)!.cores.find((core) => core.id === 'rn')!.error!,
      /matching custom serializer/
    );
  });

  for (const phase of ['pack', 'unpack'] as const) {
    it(`reports ${phase} failures on the runtime executing the callback`, () => {
      function* read(value: Point) {
        yield console.log(value.length());
      }
      function* main() {
        yield registerCustomSerializable({
          ...registration,
          [phase]: function () {
            'worklet';
            throw new Error('serializer failed');
          },
        });
        yield scheduleOnUI(read, point(3, 4));
      }
      const snapshots = simulate(
        asModule({ default: main, read }),
        [main, read].map(String).join('\n')
      );
      const errors = snapshots.flatMap((snapshot) =>
        snapshot.events.filter((event) => event.type === 'error')
      );
      assert.equal(errors.length, 1);
      assert.equal(errors[0].core, phase === 'pack' ? 'rn' : 'ui');
      assert.match(errors[0].message, /serializer failed/);
    });
  }

  it('fails explicitly for unsupported synchronous custom transfers', () => {
    function* read(value: Point) {
      return yield value.length();
    }
    function* main() {
      yield registerCustomSerializable(registration);
      const reference = yield createSerializable(point(3, 4));
      yield runOnUISync(read, reference);
    }
    const snapshots = simulate(
      asModule({ default: main, read }),
      [main, read].map(String).join('\n')
    );
    assert.match(
      snapshots.at(-1)!.cores.find((core) => core.id === 'rn')!.error!,
      /only in asynchronous call arguments/
    );
  });

  it('rejects cyclic custom payloads without overflowing the stack', () => {
    const registry = new CustomSerializerRegistry();
    registry.register({
      ...registration,
      pack(value: Point) {
        'worklet';
        return { x: value.x, y: value.y, self: value };
      },
    });
    assert.throws(
      () => packArguments([point(3, 4)], () => undefined, registry),
      /cyclic reference/
    );
  });
});
