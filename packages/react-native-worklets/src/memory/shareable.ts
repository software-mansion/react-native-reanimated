'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import type { WorkletRuntime } from '../types';
import type { SerializableRef, Shareable, ShareableConfig } from './types';

/**
 * @deprecated Only UI host runtime is supported now. Use 'UI' as the
 *   hostRuntime argument.
 */
export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  hostRuntime: WorkletRuntime,
  initial: SerializableRef<TValue>,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated>;

export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  hostRuntime: 'UI',
  initial: TValue,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated>;

export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  _hostRuntime: WorkletRuntime | 'UI',
  _initial: TValue,
  _config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated> {
  throw new WorkletsError('`createSynchronizable` is not supported on web.');
}
