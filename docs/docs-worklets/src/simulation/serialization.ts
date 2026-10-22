import { SnippetError } from './errors';

// Resolve opaque Serializable references before copying the argument graph.
// The destination receives a fresh JavaScript value, never the reference wrapper.
export function cloneArguments(
  args: unknown[],
  resolveReference: (value: object) => { value: unknown } | undefined
): unknown[] {
  const seen = new Map<object, unknown>();
  function unpack(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    const reference = resolveReference(value);
    if (reference !== undefined) {
      return unpack(reference.value);
    }
    if (seen.has(value)) {
      return seen.get(value);
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
    if (
      Array.isArray(value) ||
      Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null
    ) {
      const copy = Array.isArray(value) ? new Array(value.length) : {};
      seen.set(value, copy);
      for (const [key, entry] of Object.entries(value)) {
        Object.defineProperty(copy, key, {
          value: unpack(entry),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      return copy;
    }
    // structuredClone handles leaf values such as Date and typed arrays.
    return value;
  }
  try {
    return structuredClone(unpack(args)) as unknown[];
  } catch {
    throw new SnippetError(
      'arguments passed between runtimes must be serializable (structuredClone failed)'
    );
  }
}
