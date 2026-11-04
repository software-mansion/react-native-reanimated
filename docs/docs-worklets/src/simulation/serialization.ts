import { SnippetError } from './errors';

export interface CustomSerializer<T extends object = object, P = unknown> {
  name: string;
  determine: (value: object) => boolean;
  pack: (value: T) => P;
  unpack: (value: P) => T;
}

// Keep custom markers separate from user data. Cloning the graph and map
// together preserves aliases, including markers nested inside Maps and Sets.
export interface PackedArguments {
  values: unknown[];
  custom: Map<object, { name: string; value: unknown }>;
}

export class CustomSerializerRegistry {
  private readonly registrations = new Map<string, CustomSerializer>();

  register<T extends object, P>(registration: CustomSerializer<T, P>): void {
    for (const key of ['determine', 'pack', 'unpack'] as const) {
      const callback = registration[key];
      if (
        typeof callback !== 'function' ||
        !/\{\s*(['"])worklet\1;/.test(callback.toString())
      ) {
        throw new SnippetError(`The "${key}" function must be a worklet.`);
      }
      if (callback.constructor.name !== 'Function') {
        throw new SnippetError(
          'Custom serializer callbacks must be synchronous functions in the simulator.'
        );
      }
    }
    // Like the native registry, the first registration for a name wins.
    if (!this.registrations.has(registration.name)) {
      this.registrations.set(registration.name, {
        ...registration,
      } as unknown as CustomSerializer);
    }
  }

  find(value: object): CustomSerializer | undefined {
    return [...this.registrations.values()].find((entry) =>
      entry.determine(value)
    );
  }

  unpack(name: string, value: unknown): object {
    const registration = this.registrations.get(name);
    if (registration === undefined) {
      throw new SnippetError(
        `No custom serializable registered for "${name}".`
      );
    }
    return registration.unpack(value);
  }
}

export function packArguments(
  args: unknown[],
  resolveReference: (value: object) => PackedArguments | undefined,
  registry?: CustomSerializerRegistry
): PackedArguments {
  const seen = new Map<object, unknown>();
  const custom: PackedArguments['custom'] = new Map();
  const packing = new Set<object>();

  function pack(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) return value;
    const reference = resolveReference(value);
    if (reference !== undefined) {
      for (const [marker, entry] of reference.custom) custom.set(marker, entry);
      return reference.values[0];
    }
    if (packing.has(value)) {
      throw new SnippetError(
        'A custom serializer cannot pack a cyclic reference to itself.'
      );
    }
    if (seen.has(value)) return seen.get(value);
    if (value instanceof Map) {
      const copy = new Map();
      seen.set(value, copy);
      for (const [key, entry] of value) copy.set(pack(key), pack(entry));
      return copy;
    }
    if (value instanceof Set) {
      const copy = new Set();
      seen.set(value, copy);
      for (const entry of value) copy.add(pack(entry));
      return copy;
    }
    if (isPlain(value)) {
      const copy = Array.isArray(value) ? new Array(value.length) : {};
      seen.set(value, copy);
      for (const [key, entry] of Object.entries(value))
        set(copy, key, pack(entry));
      return copy;
    }
    if (isBuiltin(value)) return value;
    const registration = registry?.find(value);
    if (registration === undefined) {
      throw new SnippetError(
        'Cannot serialize an object with a custom prototype without a matching custom serializer on this simulation path.'
      );
    }
    const marker = {};
    seen.set(value, marker);
    packing.add(value);
    const packed = pack(registration.pack(value));
    packing.delete(value);
    custom.set(marker, { name: registration.name, value: packed });
    return marker;
  }

  const values = args.map(pack);
  try {
    return structuredClone({ values, custom }) as PackedArguments;
  } catch {
    throw new SnippetError(
      'arguments passed between runtimes must be serializable (structuredClone failed)'
    );
  }
}

export function unpackArguments(
  packet: PackedArguments,
  unpackCustom: (name: string, value: unknown) => unknown
): unknown[] {
  const { values, custom } = structuredClone(packet) as PackedArguments;
  const seen = new Map<object, unknown>();
  const unpacking = new Set<object>();

  function unpack(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) return value;
    if (seen.has(value)) return seen.get(value);
    const entry = custom.get(value);
    if (entry !== undefined) {
      if (unpacking.has(value)) {
        throw new SnippetError(
          'Cyclic custom serialized values are not supported in the simulator.'
        );
      }
      unpacking.add(value);
      const result = unpackCustom(entry.name, unpack(entry.value));
      unpacking.delete(value);
      seen.set(value, result);
      return result;
    }
    if (value instanceof Map) {
      const copy = new Map();
      seen.set(value, copy);
      for (const [key, entry] of value) copy.set(unpack(key), unpack(entry));
      return copy;
    }
    if (value instanceof Set) {
      const copy = new Set();
      seen.set(value, copy);
      for (const entry of value) copy.add(unpack(entry));
      return copy;
    }
    if (isPlain(value)) {
      const copy = Array.isArray(value) ? new Array(value.length) : {};
      seen.set(value, copy);
      for (const [key, entry] of Object.entries(value))
        set(copy, key, unpack(entry));
      return copy;
    }
    return value;
  }

  return values.map(unpack);
}

// Snapshot the packed data without invoking user callbacks in the renderer.
export function previewArguments(packet: PackedArguments): unknown[] {
  return unpackArguments(packet, (_name, value) => value);
}

// Same-step copies handle data values only. Custom serialization needs separate
// pack/unpack stages so callbacks run on the correct runtime.
export function cloneArguments(
  args: unknown[],
  resolveReference: (value: object) => { value: unknown } | undefined
): unknown[] {
  const references = new Map<object, PackedArguments>();
  return previewArguments(
    packArguments(args, (value) => {
      const cached = references.get(value);
      if (cached !== undefined) return cached;
      const reference = resolveReference(value);
      if (reference === undefined) return undefined;
      const packet = packArguments([reference.value], () => undefined);
      references.set(value, packet);
      return packet;
    })
  );
}

function isPlain(value: object): boolean {
  return (
    Array.isArray(value) ||
    Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null
  );
}

function isBuiltin(value: object): boolean {
  return (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Error ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}

function set(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}
