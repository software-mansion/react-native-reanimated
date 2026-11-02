'use strict';

import type { SerializableRef } from './types';

export function setSerializableMapping(
  _value: object,
  _mapping: unknown
): void {
  // NOOP
}

export function getSerializableMapping(
  _value: object
): SerializableRef | undefined {
  return undefined;
}

export function hasSerializableMapping(_value: object): boolean {
  return false;
}

export function removeSerializableMapping(_value: object): void {
  // NOOP
}
