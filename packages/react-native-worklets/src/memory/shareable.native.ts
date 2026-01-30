'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import { getRuntimeKind, RuntimeKind } from '../runtimeKind';
import { getUIWorkletRuntime } from '../runtimes';
import type { WorkletRuntime } from '../types';
import { isWorkletFunction } from '../workletFunction';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { createSerializable } from './serializable';
import type {
  SerializableRef,
  Shareable,
  ShareableGuestDecorator,
  ShareableHostDecorator,
} from './types';

/**
 * @deprecated Only UI host runtime is supported now. Use 'UI' as the
 *   hostRuntime argument.
 */
export function createShareable<TShared = unknown>(
  hostRuntime: WorkletRuntime,
  initial: SerializableRef<TShared>,
  config?: {
    hostDecorator?: ShareableHostDecorator;
    guestDecorator?: ShareableGuestDecorator;
  }
): Shareable<TShared>;

export function createShareable<TShared = unknown>(
  hostRuntime: 'UI',
  initial: TShared,
  config?: {
    hostDecorator?: ShareableHostDecorator;
    guestDecorator?: ShareableGuestDecorator;
  }
): Shareable<TShared>;

export function createShareable<TShared = unknown>(
  hostRuntime: WorkletRuntime | 'UI',
  initial: TShared,
  config?: {
    hostDecorator?: ShareableHostDecorator;
    guestDecorator?: ShareableGuestDecorator;
  }
): Shareable<TShared> {
  let actualHostRuntime: WorkletRuntime;
  if (hostRuntime === 'UI') {
    actualHostRuntime = getUIWorkletRuntime();
  } else {
    throw new WorkletsError('Only UI host runtime is supported currently');
  }

  const { hostDecorator, guestDecorator } = config || {};
  if (hostDecorator && !isWorkletFunction(hostDecorator)) {
    throw new WorkletsError('hostDecorator must be a worklet function');
  }
  if (guestDecorator && !isWorkletFunction(guestDecorator)) {
    throw new WorkletsError('guestDecorator must be a worklet function');
  }

  const shareableRef = WorkletsModule.createShareable(
    actualHostRuntime,
    createSerializable(initial),
    createSerializable(hostDecorator),
    createSerializable(guestDecorator)
  );

  // const isHost = getRuntimeKind() === RuntimeKind.UI;
  if (getRuntimeKind() === RuntimeKind.UI) {
    return globalThis.__shareableHostUnpacker(
      initial,
      hostDecorator
    ) as unknown as Shareable<TShared>;
  } else {
    return globalThis.__shareableGuestUnpacker(
      shareableRef,
      guestDecorator
    ) as unknown as Shareable<TShared>;
  }
}
