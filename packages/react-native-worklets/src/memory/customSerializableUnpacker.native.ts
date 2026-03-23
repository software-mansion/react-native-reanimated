/* eslint-disable reanimated/use-worklets-error */
'use strict';

export function __installUnpacker() {
  if (!globalThis.__customSerializationRegistry) {
    globalThis.__customSerializationRegistry =
      [] as typeof globalThis.__customSerializationRegistry;
  }
  const registry = globalThis.__customSerializationRegistry;

  function customSerializableUnpacker<TValue>(value: TValue, typeId: number) {
    const data = registry[typeId];
    if (!data) {
      throw new Error(
        `[Worklets] No custom serializable registered for type ID ${typeId}.`
      );
    }

    return data.unpack(value as object);
  }

  globalThis.__customSerializableUnpacker =
    customSerializableUnpacker as CustomSerializableUnpacker;
}

export type CustomSerializableUnpacker = (
  object: unknown,
  typeId: number
) => unknown;
