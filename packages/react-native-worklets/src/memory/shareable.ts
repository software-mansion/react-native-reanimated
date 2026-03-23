'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import type { UIRuntimeId } from '../runtimes';
import type { Shareable, ShareableConfig } from './types';

/**
 * Creates a new {@link Shareable} holding the provided initial value. You must
 * explicitly declare which Worklet Runtime will host the Shareable by passing
 * its `runtimeId`.
 *
 * Currently only hosting a Shareable on the UI Runtime is supported.
 *
 * @param hostRuntimeId - The `runtimeId` of the Worklet Runtime that will host
 *   the Shareable. Use {@link UIRuntimeId}.
 * @param initial - The initial value of the Shareable.
 * @param config - Optional advanced configuration.
 * @returns The created {@link Shareable}.
 * @see {@link https://docs.swmansion.com/react-native-worklets/docs/memory/createShareable | createShareable docs}
 */
export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  hostRuntimeId: typeof UIRuntimeId,
  initial: TValue,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated>;

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
  throw new WorkletsError('`createShareable` is not supported on web.');
}
