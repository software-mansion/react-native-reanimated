'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import { getRuntimeKind, RuntimeKind } from '../runtimeKind';
import { UIRuntimeId } from '../runtimes';
import type { WorkletRuntime } from '../types';
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
  hostRuntime: WorkletRuntime | 'UI',
  initial: TValue,
  config?: ShareableConfig<TValue, THostDecorated, TGuestDecorated>
): Shareable<TValue, THostDecorated, TGuestDecorated> {
  if (hostRuntime !== 'UI') {
    throw new WorkletsError('Only UI host runtime is supported currently');
  }

  const { hostDecorator, guestDecorator, initSynchronously } = config || {};
  if (hostDecorator && !isWorkletFunction(hostDecorator)) {
    throw new WorkletsError('hostDecorator must be a worklet function');
  }
  if (guestDecorator && !isWorkletFunction(guestDecorator)) {
    throw new WorkletsError('guestDecorator must be a worklet function');
  }

  const shareableRef = WorkletsModule.createShareable(
    UIRuntimeId,
    createSerializable(initial),
    !!initSynchronously,
    createSerializable(hostDecorator),
    createSerializable(guestDecorator)
  );

  if (getRuntimeKind() === RuntimeKind.UI) {
    return globalThis.__shareableHostUnpacker(initial, hostDecorator);
  } else {
    return globalThis.__shareableGuestUnpacker(
      UIRuntimeId,
      shareableRef,
      guestDecorator
    );
  }
}
