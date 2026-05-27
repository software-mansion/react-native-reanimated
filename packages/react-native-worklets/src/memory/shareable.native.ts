'use strict';

import { addNoBundleModeGuardImplementation } from '../guardImplementation';
import { isWorkletFunction } from '../workletFunction';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { createSerializable } from './serializable';
import type { Shareable, ShareableConfig } from './types';

/**
 * Creates a new {@link Shareable} holding the provided initial value. You must
 * explicitly declare which Worklet Runtime will host the Shareable by passing
 * its `runtimeId`. To host on the UI Runtime, pass {@link UIRuntimeId}.
 *
 * @param hostRuntimeId - The `runtimeId` of the Worklet Runtime that will host
 *   the Shareable.
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
  hostRuntimeId: number,
  initial: TValue,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated>;

export function createShareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
>(
  hostRuntimeId: number,
  initial: TValue,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated> {
  const { hostDecorator, guestDecorator, initSynchronously } = config || {};
  if (__DEV__) {
    if (hostDecorator && !isWorkletFunction(hostDecorator)) {
      throw new Error('[Worklets] hostDecorator must be a worklet function');
    }
    if (guestDecorator && !isWorkletFunction(guestDecorator)) {
      throw new Error('[Worklets] guestDecorator must be a worklet function');
    }
  }

  const shareableRef = WorkletsModule.createShareable(
    hostRuntimeId,
    createSerializable(initial),
    !!initSynchronously,
    createSerializable(hostDecorator),
    createSerializable(guestDecorator)
  );

  return globalThis.__shareableGuestUnpacker(
    hostRuntimeId,
    shareableRef,
    guestDecorator
  );
}

if (__DEV__ && !globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
  addNoBundleModeGuardImplementation(createShareable);
}
