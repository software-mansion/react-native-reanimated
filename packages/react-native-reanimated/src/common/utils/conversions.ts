'use strict';
import type { AnyRecord, ConvertValuesToArrays } from '../types';

export function convertPropertyToArray<T>(value: T | undefined): T[] {
  return value !== undefined ? (Array.isArray(value) ? value : [value]) : [];
}

export function convertPropertiesToArrays<T extends AnyRecord>(config: T) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      convertPropertyToArray(value),
    ])
  ) as ConvertValuesToArrays<T>;
}

export function kebabizeCamelCase<T extends string>(property: T) {
  return property.replace(/[A-Z]/g, (x) => `-${x.toLowerCase()}`);
}

export function camelizeKebabCase<T extends string>(property: T) {
  return property.replace(/-./g, (x) => x[1].toUpperCase());
}
