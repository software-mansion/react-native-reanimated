'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import type { UIRuntimeId } from '../runtimes';
import type { SerializableRef, Shareable, ShareableConfig } from './types';

/**
 * @deprecated Only UI host runtime is supported now. Use {@link UIRuntimeId} as
 *   the `hostRuntimeId` argument.
 */
export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  hostRuntimeId: number,
  initial: SerializableRef<TValue>,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated>;

export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  hostRuntimeId: typeof UIRuntimeId,
  initial: TValue,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated>;

export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  _hostRuntimeId: number,
  _initial: TValue,
  _config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated> {
  throw new WorkletsError('`createSynchronizable` is not supported on web.');
}
