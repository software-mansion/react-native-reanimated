'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import { addGuardImplementation } from '../guardImplementation';
import { UIRuntimeId } from '../runtimes';
import { isWorkletFunction } from '../workletFunction';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { createSerializable } from './serializable';
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
  hostRuntimeId: number,
  initial: TValue,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated> {
  if (hostRuntimeId !== UIRuntimeId) {
    throw new WorkletsError('Only UI host runtime is supported currently');
  }

  const { hostDecorator, guestDecorator, initSynchronously } = config || {};
  if (__DEV__) {
    if (hostDecorator && !isWorkletFunction(hostDecorator)) {
      throw new WorkletsError('hostDecorator must be a worklet function');
    }
    if (guestDecorator && !isWorkletFunction(guestDecorator)) {
      throw new WorkletsError('guestDecorator must be a worklet function');
    }
  }

  const shareableRef = WorkletsModule.createShareable(
    UIRuntimeId,
    createSerializable(initial),
    !!initSynchronously,
    createSerializable(hostDecorator),
    createSerializable(guestDecorator)
  );

  return globalThis.__shareableGuestUnpacker(
    UIRuntimeId,
    shareableRef,
    guestDecorator
  );
}

if (__DEV__ && globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
  addGuardImplementation(createShareable);
}
