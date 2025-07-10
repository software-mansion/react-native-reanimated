'use strict';

export function hasSuffix(value: unknown): value is string {
  return typeof value === 'string' && isNaN(parseInt(value[value.length - 1]));
}

export function maybeAddSuffix(value: unknown, suffix: string) {
  return hasSuffix(value) ? value : `${String(value)}${suffix}`;
}
