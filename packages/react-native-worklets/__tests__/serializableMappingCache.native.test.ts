// `serializableMappingCache` must not own a clone whose subtree holds a JS
// (non-worklet) function. Such a clone owns a remote function that holds the
// JS function strongly, so a function whose closure reaches the cache key
// would close a cycle across runtimes that no GC can collect. These clones are
// cached through a non-owning marker instead. The tests drive
// `createSerializable` against a fake native module that models the marker's
// `weak_ptr` with a set of live ids. Like the C++ constructors, the fake also
// works out from the children it is handed whether each serializable it mints
// holds a remote function. That is the ground truth the classification in JS
// has to agree with.

type FakeRef = { __serializableRef: true; id: number };
type FakeMarker = { target: number };

/** Native factories that own children, and the children each one is handed. */
const CONTAINER_FACTORIES: Record<string, (...args: unknown[]) => unknown[]> = {
  createSerializableArray: (elements) => elements as unknown[],
  createSerializableObject: (props) => Object.values(props as object),
  createSerializableWorklet: (props) => Object.values(props as object),
  createSerializableTurboModuleLike: (props) => Object.values(props as object),
  createSerializableMap: (keys, values) => [
    ...(keys as unknown[]),
    ...(values as unknown[]),
  ],
  createSerializableSet: (values) => values as unknown[],
  createCustomSerializable: (data) => [data],
};

const LEAF_FACTORIES = [
  'createSerializableArrayBuffer',
  'createSerializableArrayBufferView',
  'createSerializableBigInt',
  'createSerializableBoolean',
  'createSerializableError',
  'createSerializableHostObject',
  'createSerializableImport',
  'createSerializableNull',
  'createSerializableNumber',
  'createSerializableRegExp',
  'createSerializableString',
  'createSerializableUndefined',
];

type Registration = {
  name: string;
  determine: (value: object) => boolean;
  pack: (value: never) => unknown;
  unpack: (value: never) => unknown;
};

interface Harness {
  native: Record<string, jest.Mock>;
  /** Whether the native serializable with this id holds a remote function. */
  holds: Map<number, boolean>;
  /** Simulates the last native owner of the serializable releasing it. */
  release(ref: FakeRef): void;
  createSerializable(value: unknown, shouldPersistRemote?: boolean): FakeRef;
  createSerializableWorklet(value: unknown): FakeRef;
  makeShareable(value: object): object;
  cache: {
    get(key: object): unknown;
    set(key: object, value?: object): void;
  };
  registry: Registration[];
}

const realWeakRef = globalThis.WeakRef;

afterEach(() => {
  globalThis.WeakRef = realWeakRef;
});

function setup(): Harness {
  let nextId = 1;
  const live = new Set<number>();
  const holds = new Map<number, boolean>();
  const holdsFunction = (child: unknown): boolean =>
    typeof child === 'function'
      ? (child as { __remoteFunction?: boolean }).__remoteFunction === true
      : typeof child === 'object' &&
        child !== null &&
        holds.get((child as FakeRef).id) === true;
  const mint = (holdsRemoteFunction: boolean): FakeRef => {
    const id = nextId++;
    live.add(id);
    holds.set(id, holdsRemoteFunction);
    return { __serializableRef: true, id };
  };
  const native: Record<string, jest.Mock> = {};
  for (const [name, children] of Object.entries(CONTAINER_FACTORIES)) {
    native[name] = jest.fn((...args: unknown[]) =>
      mint(children(...args).some(holdsFunction))
    );
  }
  for (const name of LEAF_FACTORIES) {
    native[name] = jest.fn(() => mint(false));
  }
  native.createSerializableNonWorkletFunction = jest.fn(() => mint(true));
  native.makeWeakSerializableRef = jest.fn(
    (ref: FakeRef): FakeMarker => ({ target: ref.id })
  );
  native.derefWeakSerializableRef = jest.fn((marker: FakeMarker) =>
    live.has(marker.target)
      ? { __serializableRef: true as const, id: marker.target }
      : undefined
  );

  // A `WeakRef` whose target is collected when the test releases it.
  class ReleasableWeakRef<T extends object> {
    constructor(private readonly referent: T) {}
    deref(): T | undefined {
      return live.has((this.referent as unknown as FakeRef).id)
        ? this.referent
        : undefined;
    }
  }
  (globalThis as { WeakRef: unknown }).WeakRef = ReleasableWeakRef;

  const registry: Registration[] = [];
  (
    globalThis as { __customSerializationRegistry?: unknown }
  ).__customSerializationRegistry = registry;

  let harness!: Harness;
  jest.isolateModules(() => {
    jest.doMock('react-native-worklets/WorkletsModule/NativeWorklets', () => ({
      WorkletsModule: native,
    }));
    const serializable = require('react-native-worklets/memory/serializable');
    const {
      serializableMappingCache,
    } = require('react-native-worklets/memory/serializableMappingCache');
    harness = {
      native,
      holds,
      release: (ref) => live.delete(ref.id),
      createSerializable: serializable.createSerializable,
      createSerializableWorklet: serializable.createSerializableWorklet,
      makeShareable: serializable.makeShareable,
      cache: serializableMappingCache,
      registry,
    };
  });
  return harness;
}

let nextWorkletHash = 1000;

function fakeWorklet(
  closure: Record<string, unknown>,
  initData?: Record<string, string>
) {
  const hash = nextWorkletHash++;
  return Object.assign(function worklet() {}, {
    __workletHash: hash,
    __closure: closure,
    __initData: initData ?? {
      code: `function w${hash}(){}`,
      location: 'test.ts',
      sourceMap: '{}',
    },
  });
}

function isMarker(value: unknown): value is FakeMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    'target' in value &&
    !('__serializableRef' in value)
  );
}

/** What a remote function hosted on another runtime unpacks to. */
function remoteFunction() {
  return Object.assign(() => 0, {
    __remoteFunction: true,
    __serializableRef: true,
  });
}

/** Mulberry32, so every graph can be rebuilt from its seed. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Serialized through `registerCustomSerializable`. */
class Box {
  constructor(readonly payload: unknown) {}
}

/** Host objects answer `true` to every `in` check. */
const hostObject = () => new Proxy({}, { has: () => true });
const turboModuleProto = hostObject();

interface Graph {
  root: unknown;
  /** Values that get their own cache entry once `root` is serialized. */
  cached: object[];
  /** Containers and functions that a test can serialize on their own first. */
  parts: unknown[];
}

/**
 * Builds a random acyclic graph of every shape the serializer handles. A node
 * is reused as a child of a later node now and then, so some children are
 * shared.
 */
function buildGraph(next: () => number, h: Harness): Graph {
  const cached: object[] = [];
  const parts: unknown[] = [];
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(next() * items.length)];

  const leaf = (): unknown => {
    switch (
      pick([
        'number',
        'string',
        'null',
        'undefined',
        'function',
        'remote',
        'flagged',
        'functionRef',
        'host',
      ] as const)
    ) {
      case 'number':
        return Math.floor(next() * 100);
      case 'string':
        return `s${Math.floor(next() * 100)}`;
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      case 'function': {
        const fn = () => 0;
        parts.push(fn);
        return fn;
      }
      case 'remote':
        return remoteFunction();
      case 'flagged': {
        const ref = { __serializableRef: true, id: -1 };
        h.cache.set(ref);
        return ref;
      }
      case 'functionRef':
        return h.createSerializable(() => 0);
      case 'host': {
        const host = hostObject();
        cached.push(host);
        return host;
      }
    }
  };

  const node = (depth: number): unknown => {
    if (parts.length > 0 && next() < 0.15) {
      return pick(parts);
    }
    if (depth >= 4 || next() < 0.35) {
      return leaf();
    }
    const children = () =>
      Array.from({ length: 1 + Math.floor(next() * 4) }, () => node(depth + 1));
    const record = () =>
      Object.fromEntries(children().map((child, i) => [`k${i}`, child]));
    let value: unknown;
    switch (
      pick([
        'object',
        'array',
        'worklet',
        'map',
        'set',
        'turboModuleLike',
        'custom',
      ] as const)
    ) {
      case 'object':
        value = record();
        cached.push(value as object);
        break;
      case 'array':
        value = children();
        cached.push(value as object);
        break;
      case 'worklet': {
        const worklet = fakeWorklet(record());
        cached.push(worklet, worklet.__closure, worklet.__initData);
        value = worklet;
        break;
      }
      case 'map': {
        const values = children();
        const keys = values.map((_, i) =>
          next() < 0.5 ? `key${i}` : node(depth + 1)
        );
        // Equal keys would drop values, so repeats become strings.
        value = new Map(
          keys.map((key, i) => [
            keys.indexOf(key) === i ? key : `repeat${i}`,
            values[i],
          ])
        );
        cached.push(value as object);
        break;
      }
      case 'set':
        value = new Set(children());
        cached.push(value as object);
        break;
      case 'turboModuleLike':
        value = Object.assign(Object.create(turboModuleProto), record());
        break;
      case 'custom':
        value = new Box(node(depth + 1));
        break;
    }
    parts.push(value);
    return value;
  };

  return { root: node(0), cached, parts };
}

describe('serializableMappingCache and clones that hold a JS function', () => {
  const globalWithDev = globalThis as unknown as { __DEV__?: boolean };

  beforeEach(() => {
    globalWithDev.__DEV__ = false;
  });

  afterEach(() => {
    delete globalWithDev.__DEV__;
    jest.restoreAllMocks();
  });

  test('caches a worklet that captures a JS function through a marker', () => {
    const { native, createSerializable, cache } = setup();
    const worklet = fakeWorklet({ callback: () => 42 });

    const first = createSerializable(worklet);
    const second = createSerializable(worklet);

    const entry = cache.get(worklet);
    expect(isMarker(entry)).toBe(true);
    expect((entry as FakeMarker).target).toBe(first.id);
    // A hit returns a new reference to the same native serializable.
    expect(second).not.toBe(first);
    expect(second.id).toBe(first.id);
    expect(native.createSerializableWorklet).toHaveBeenCalledTimes(1);
  });

  test('serializes the worklet again once the clone was released', () => {
    const { native, release, createSerializable, cache } = setup();
    const worklet = fakeWorklet({ callback: () => 1 });

    const first = createSerializable(worklet);
    release(first);
    const second = createSerializable(worklet);

    expect(native.createSerializableWorklet).toHaveBeenCalledTimes(2);
    expect(second.id).not.toBe(first.id);
    expect((cache.get(worklet) as FakeMarker).target).toBe(second.id);
  });

  test('serializes `__initData` once, even after the clone was released', () => {
    const { native, release, createSerializable } = setup();
    const initData = { code: 'function f(){}', location: 'x', sourceMap: '' };
    const worklet = fakeWorklet({ callback: () => 1 }, initData);

    release(createSerializable(worklet));
    createSerializable(worklet);

    const initDataCalls = native.createSerializableObject.mock.calls.filter(
      (call) => call[2] === initData
    );
    expect(initDataCalls).toHaveLength(1);
    expect(native.createSerializableWorklet).toHaveBeenCalledTimes(2);
  });

  test('keeps a worklet without JS functions in its closure strong', () => {
    const { native, createSerializable, cache } = setup();
    const shareable = { __serializableRef: true, id: -1 };
    cache.set(shareable);
    const worklet = fakeWorklet({ count: 3, shareable, nested: { a: 1 } });

    const first = createSerializable(worklet);

    expect(createSerializable(worklet)).toBe(first);
    expect(cache.get(worklet)).toBe(first);
    expect(native.makeWeakSerializableRef).not.toHaveBeenCalled();
  });

  test('marks containers exactly when their subtree holds a JS function', () => {
    const { createSerializable, cache } = setup();
    const callback = () => 0;
    const plain = { a: 1, b: [2, 3], c: new Map([[1, 'x']]) };
    const object = { callback };
    const array = [fakeWorklet({ callback })];
    const map = new Map([[{ key: 1 }, callback]]);
    const set = new Set([callback]);
    const inner = { callback };
    const outer = { inner };

    for (const value of [plain, object, array, map, set, outer]) {
      createSerializable(value);
    }

    expect(cache.get(plain)).toHaveProperty('__serializableRef', true);
    for (const value of [object, array, map, set, inner, outer]) {
      expect(isMarker(cache.get(value))).toBe(true);
    }
  });

  test('marks a worklet whose closure holds a cached worklet with a JS function', () => {
    const { native, createSerializable, cache } = setup();
    const inner = fakeWorklet({ callback: () => 1 });
    createSerializable(inner);
    native.makeWeakSerializableRef.mockClear();

    const outer = fakeWorklet({ inner });
    createSerializable(outer);

    // `inner` was a cache hit through its marker and still marks `outer`.
    expect(native.derefWeakSerializableRef).toHaveBeenCalled();
    expect(isMarker(cache.get(outer))).toBe(true);
    expect(isMarker(cache.get(outer.__closure))).toBe(true);
  });

  test('marks a worklet that captures an existing remote function', () => {
    const { createSerializable, cache } = setup();
    const remote = Object.assign(() => 0, {
      __remoteFunction: true,
      __serializableRef: true,
    });
    const worklet = fakeWorklet({ remote });

    createSerializable(worklet);

    expect(isMarker(cache.get(worklet))).toBe(true);
  });

  test('keeps a persisted clone strong', () => {
    const { native, createSerializable, cache } = setup();
    const value = { callback: () => 0 };

    const first = createSerializable(value, true);

    expect(cache.get(value)).toBe(first);
    expect(createSerializable(value, true)).toBe(first);
    expect(native.makeWeakSerializableRef).not.toHaveBeenCalled();
  });

  test('keeps an entry set by a library strong', () => {
    const { native, createSerializable, cache } = setup();
    const fn = () => 0;
    const replacement = { __serializableRef: true, id: -7 };
    cache.set(fn, replacement);

    expect(createSerializable(fn)).toBe(replacement);
    expect(cache.get(fn)).toBe(replacement);
    expect(native.createSerializableNonWorkletFunction).not.toHaveBeenCalled();
    expect(native.makeWeakSerializableRef).not.toHaveBeenCalled();
  });

  test('still caches remote functions through a WeakRef', () => {
    const { native, createSerializable, cache } = setup();
    const callback = () => 0;

    const first = createSerializable(callback);

    expect(cache.get(callback)).toBeInstanceOf(WeakRef);
    expect(createSerializable(callback)).toBe(first);
    expect(native.createSerializableNonWorkletFunction).toHaveBeenCalledTimes(
      1
    );
  });

  test('returns a reference obtained through a marker unchanged', () => {
    const { native, createSerializable } = setup();
    const worklet = fakeWorklet({ callback: () => 1 });

    const first = createSerializable(worklet);
    const fromMarker = createSerializable(worklet);

    expect(createSerializable(fromMarker)).toBe(fromMarker);
    expect(createSerializable(first)).toBe(first);
    expect(native.createSerializableObject).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      fromMarker
    );
  });

  test('createSerializableWorklet goes through the marker too', () => {
    const { native, release, createSerializableWorklet } = setup();
    const worklet = fakeWorklet({ callback: () => 1 });

    const first = createSerializableWorklet(worklet);
    expect(createSerializableWorklet(worklet).id).toBe(first.id);
    expect(native.createSerializableWorklet).toHaveBeenCalledTimes(1);

    release(first);
    expect(createSerializableWorklet(worklet).id).not.toBe(first.id);
    expect(native.createSerializableWorklet).toHaveBeenCalledTimes(2);
  });

  describe('each clone reports whether it holds a JS function', () => {
    test('a cache entry is a marker exactly when its native serializable holds a remote function', () => {
      for (let seed = 1; seed <= 400; seed++) {
        const next = random(seed);
        const h = setup();
        h.registry.push(
          {
            // Never matches, but serializes a function of its own every time.
            name: 'Noisy',
            determine: () => {
              h.createSerializable(() => 0);
              return false;
            },
            pack: () => 0,
            unpack: () => 0,
          },
          {
            name: 'Box',
            determine: (value) => value instanceof Box,
            pack: (box: Box) => {
              h.createSerializable(() => 1);
              return { payload: box.payload };
            },
            unpack: () => 0,
          }
        );
        const { root, cached, parts } = buildGraph(next, h);

        // Cache some parts first, then release some clones the cache does not own.
        for (const part of parts) {
          if (next() < 0.3) {
            const ref = h.createSerializable(part);
            const entry = h.cache.get(part as object);
            if ((isMarker(entry) || entry instanceof WeakRef) && next() < 0.5) {
              h.release(ref);
            }
          }
        }
        h.createSerializable(root);

        for (const value of cached) {
          const entry = h.cache.get(value);
          const id = isMarker(entry) ? entry.target : (entry as FakeRef).id;
          if (isMarker(entry) !== (h.holds.get(id) === true)) {
            throw new Error(
              `Seed ${seed}: the clone ${h.holds.get(id) ? 'holds' : 'does not hold'} a remote function, but its entry is ${isMarker(entry) ? 'a marker' : 'strong'}.`
            );
          }
        }
        for (const [ref] of h.native.makeWeakSerializableRef.mock.calls) {
          expect(h.holds.get((ref as FakeRef).id)).toBe(true);
        }
      }
    });

    test('a cold serialize without JS functions does not look at the clones it made', () => {
      const h = setup();
      const tree = {
        wide: Object.fromEntries(
          Array.from({ length: 500 }, (_, i) => [`k${i}`, i])
        ),
        list: [1, 'two', [3, 4], { five: 5 }],
        map: new Map<unknown, unknown>([['a', { b: 1 }]]),
        set: new Set([1, 2]),
      };
      const has = jest.spyOn(WeakSet.prototype, 'has');
      const add = jest.spyOn(WeakSet.prototype, 'add');

      h.createSerializable(tree);

      expect(has).not.toHaveBeenCalled();
      expect(add).not.toHaveBeenCalled();
      expect(h.native.makeWeakSerializableRef).not.toHaveBeenCalled();
    });

    test('a hit on a clone without JS functions reads nothing but its own entry', () => {
      const h = setup();
      const initData = {
        code: 'function w(){}',
        location: 'a.ts',
        sourceMap: '{}',
      };
      const worklet = fakeWorklet({ scale: 2 }, initData);
      const persisted = { p: 1 };
      const library = { l: 1 };
      const first = h.createSerializable(worklet);
      const persistedClone = h.createSerializable(persisted, true);
      const libraryClone = h.createSerializable({ x: 1 });
      h.cache.set(library, libraryClone);
      const get = jest.spyOn(WeakMap.prototype, 'get');
      const has = jest.spyOn(WeakSet.prototype, 'has');

      // A top-level hit, a clone passed back, a persisted clone and a library
      // entry: one read each.
      expect(h.createSerializable(worklet)).toBe(first);
      expect(h.createSerializable(first)).toBe(first);
      expect(h.createSerializable(persisted)).toBe(persistedClone);
      expect(h.createSerializable(library)).toBe(libraryClone);
      expect(get).toHaveBeenCalledTimes(4);

      // A cold worklet whose `__initData` hits: one read each for the worklet
      // and its closure, and two for `__initData`, which `cloneWorklet`
      // serializes once with its other properties and once persisted.
      get.mockClear();
      h.createSerializable(fakeWorklet({ offset: 1 }, initData));
      expect(get).toHaveBeenCalledTimes(4);

      expect(has).not.toHaveBeenCalled();
      expect(h.native.makeWeakSerializableRef).not.toHaveBeenCalled();
    });

    test('the work for a cold worklet does not grow with its closure', () => {
      const lookups = (size: number) => {
        const h = setup();
        const worklet = fakeWorklet(
          Object.fromEntries(
            Array.from({ length: size }, (_, i) => [`v${i}`, i])
          )
        );
        const get = jest.spyOn(WeakMap.prototype, 'get');
        h.createSerializable(worklet);
        const calls = get.mock.calls.length;
        get.mockRestore();
        return calls;
      };

      expect(lookups(200)).toBe(lookups(1));
    });

    test('a shared child that holds a JS function makes every parent weak and is cloned once', () => {
      const h = setup();
      const shared = { callback: () => 0 };
      const left = { shared };
      const right = [shared];
      const root = { left, right };

      h.createSerializable(root);

      for (const value of [shared, left, right, root]) {
        expect(isMarker(h.cache.get(value))).toBe(true);
      }
      expect(
        h.native.createSerializableObject.mock.calls.filter(
          (call) => call[2] === shared
        )
      ).toHaveLength(1);
    });

    test('a shared child without JS functions keeps every parent strong', () => {
      const h = setup();
      const shared = { n: 1 };
      const root = { left: { shared }, right: [shared] };

      h.createSerializable(root);

      expect(isMarker(h.cache.get(root))).toBe(false);
      expect(h.native.makeWeakSerializableRef).not.toHaveBeenCalled();
    });

    test.each<[string, (h: Harness) => unknown]>([
      [
        'a persisted clone',
        (h) => {
          const child = { callback: () => 0 };
          expect(h.cache.get(child)).toBeUndefined();
          expect(h.createSerializable(child, true)).toBe(h.cache.get(child));
          return child;
        },
      ],
      [
        'an entry set by a library',
        (h) => {
          const key = {};
          h.cache.set(key, h.createSerializable({ callback: () => 0 }));
          return key;
        },
      ],
      [
        'a library entry for a turbo-module-like clone',
        (h) => {
          const key = {};
          const turboModule = Object.create(turboModuleProto);
          turboModule.callback = () => 0;
          h.cache.set(key, h.createSerializable(turboModule));
          return key;
        },
      ],
      [
        'a library entry for a custom clone',
        (h) => {
          h.registry.push({
            name: 'Box',
            determine: (value) => value instanceof Box,
            pack: (box: Box) => ({ payload: box.payload }),
            unpack: () => 0,
          });
          const key = {};
          h.cache.set(key, h.createSerializable(new Box(() => 0)));
          return key;
        },
      ],
      ['a function clone passed back', (h) => h.createSerializable(() => 0)],
      [
        'a reference from a marker passed back',
        (h) => {
          const worklet = fakeWorklet({ callback: () => 0 });
          h.createSerializable(worklet);
          return h.createSerializable(worklet);
        },
      ],
      [
        'a value whose clone was released',
        (h) => {
          const child = { callback: () => 0 };
          h.release(h.createSerializable(child));
          return child;
        },
      ],
      [
        'a function whose clone is alive',
        (h) => {
          const fn = () => 0;
          h.createSerializable(fn);
          return fn;
        },
      ],
      [
        'a function whose clone was released',
        (h) => {
          const fn = () => 0;
          h.release(h.createSerializable(fn));
          return fn;
        },
      ],
      ['a remote function', () => remoteFunction()],
      [
        'a value passed to makeShareable',
        (h) => {
          const value = { callback: () => 0 };
          h.makeShareable(value);
          return value;
        },
      ],
    ])('%s that holds a JS function makes its parents weak', (_, make) => {
      const h = setup();
      const child = make(h);
      const parents = [
        { child },
        [child],
        new Map([['key', child]]),
        new Set([child]),
        fakeWorklet({ child }),
      ];

      for (const parent of parents) {
        h.createSerializable(parent);
      }

      for (const parent of parents) {
        expect(isMarker(h.cache.get(parent))).toBe(true);
      }
    });

    test('a persisted clone and a library entry without JS functions keep their parent strong', () => {
      const h = setup();
      const persisted = { n: 1 };
      h.createSerializable(persisted, true);
      const key = {};
      h.cache.set(key, h.createSerializable({ n: 2 }));
      const parent = { persisted, key };

      h.createSerializable(parent);

      expect(isMarker(h.cache.get(parent))).toBe(false);
      expect(h.native.makeWeakSerializableRef).not.toHaveBeenCalled();
    });

    test('a library entry holding a remote function never serialized here makes its parent weak', () => {
      const h = setup();
      const key = {};
      h.cache.set(key, remoteFunction() as never);
      const parent = { key };

      h.createSerializable(parent);

      expect(isMarker(h.cache.get(parent))).toBe(true);
    });

    test('a persisted clone that holds a JS function stays strong and makes its parent weak', () => {
      const h = setup();
      const inner = { callback: () => 0 };
      const persisted = { inner };
      h.createSerializable(persisted, true);
      const outer = { persisted };

      h.createSerializable(outer);

      expect(isMarker(h.cache.get(inner))).toBe(false);
      expect(isMarker(h.cache.get(persisted))).toBe(false);
      expect(isMarker(h.cache.get(outer))).toBe(true);
    });

    test('a Map key and a Set element that hold a JS function make their container weak', () => {
      const h = setup();
      const map = new Map([[{ callback: () => 0 }, 1]]);
      const set = new Set([{ callback: () => 0 }]);

      h.createSerializable(map);
      h.createSerializable(set);

      expect(isMarker(h.cache.get(map))).toBe(true);
      expect(isMarker(h.cache.get(set))).toBe(true);
    });

    test('a turbo-module-like makes its parent weak exactly when it holds a JS function', () => {
      const h = setup();
      const bearing = Object.create(turboModuleProto);
      bearing.callback = () => 0;
      const plain = Object.create(turboModuleProto);
      plain.n = 1;
      const withFunction = { module: bearing };
      const withoutFunction = { module: plain };

      h.createSerializable(withFunction);
      h.createSerializable(withoutFunction);

      expect(isMarker(h.cache.get(withFunction))).toBe(true);
      expect(isMarker(h.cache.get(withoutFunction))).toBe(false);
    });

    test('a custom serializable counts its packed data, not what `determine` or `pack` serialize on their own', () => {
      const h = setup();
      h.registry.push({
        name: 'Box',
        determine: (value) => {
          h.createSerializable(() => 0);
          return value instanceof Box;
        },
        pack: (box: Box) => {
          h.createSerializable(() => 1);
          return { payload: box.payload };
        },
        unpack: () => 0,
      });
      const withFunction = { box: new Box(() => 2) };
      const withoutFunction = { box: new Box(3) };

      h.createSerializable(withFunction);
      h.createSerializable(withoutFunction);

      expect(isMarker(h.cache.get(withFunction))).toBe(true);
      expect(isMarker(h.cache.get(withoutFunction))).toBe(false);
    });

    test('a cyclic object that throws leaves nothing behind for the next call', () => {
      const h = setup();
      const fn = () => 0;
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      expect(() => h.createSerializable({ fn, cyclic })).toThrow(/cyclic/);

      const plain = { a: 1 };
      const again = { fn };
      h.createSerializable(plain);
      h.createSerializable(again);

      expect(isMarker(h.cache.get(plain))).toBe(false);
      // `fn` was cloned before the throw and is a cache hit now.
      expect(isMarker(h.cache.get(again))).toBe(true);
      expect(
        h.native.createSerializableNonWorkletFunction
      ).toHaveBeenCalledTimes(1);
    });

    test('a throw caught in the middle of a traversal does not hide a JS function seen before it', () => {
      const h = setup();
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const list: unknown[] = [() => 0, 0];
      // `Array.prototype.map` reads index 1 after it cloned index 0.
      Object.defineProperty(list, 1, {
        enumerable: true,
        get() {
          try {
            h.createSerializable(cyclic);
          } catch {
            // The traversal of `list` goes on.
          }
          return 0;
        },
      });

      h.createSerializable(list);

      expect(isMarker(h.cache.get(list))).toBe(true);
    });
  });
});
