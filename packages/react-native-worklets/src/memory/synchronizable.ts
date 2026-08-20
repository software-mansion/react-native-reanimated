'use strict';

import type {
  FixedSynchronizable,
  Synchronizable,
  SynchronizableConfig,
} from './types';

export function createSynchronizable<TValue extends number | boolean>(
  initialValue: TValue,
  config: SynchronizableConfig & { fixedType: true }
): FixedSynchronizable<TValue extends boolean ? boolean : number>;

export function createSynchronizable<TValue extends number | boolean>(
  initialValue: TValue,
  config: SynchronizableConfig
): Synchronizable<TValue> | FixedSynchronizable<TValue>;

export function createSynchronizable<TValue = unknown>(
  initialValue: TValue,
  config?: SynchronizableConfig
): Synchronizable<TValue>;

export function createSynchronizable<TValue = unknown>(
  _initialValue: TValue,
  _config?: SynchronizableConfig
): Synchronizable<TValue> {
  throw new Error('[Worklets] `createSynchronizable` is not supported on web.');
}
