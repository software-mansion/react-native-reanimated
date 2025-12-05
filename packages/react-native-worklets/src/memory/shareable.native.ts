'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import { getUIWorkletRuntime } from '../runtimes';
import type { WorkletRuntime } from '../types';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { createSerializable } from './serializable';
import type { SerializableRef, Shareable } from './types';

/**
 * @deprecated Only UI host runtime is supported now. Use 'UI' as the
 *   hostRuntime argument.
 */
export function createShareable<TValue = unknown>(
  hostRuntime: WorkletRuntime,
  initialValue: SerializableRef<TValue>
): Shareable<TValue>;

export function createShareable<TValue = unknown>(
  hostRuntime: 'UI',
  initialValue: TValue
): Shareable<TValue>;

export function createShareable<TValue = unknown>(
  hostRuntime: WorkletRuntime | 'UI',
  initialValue: TValue,
  config?: { inline: true }
): Shareable<TValue> {
  let actualHostRuntime: WorkletRuntime;
  if (hostRuntime === 'UI') {
    actualHostRuntime = getUIWorkletRuntime();
  } else {
    throw new WorkletsError('Only UI host runtime is supported currently');
  }

  const shareableRef = WorkletsModule.createShareable(
    actualHostRuntime,
    createSerializable(initialValue),
    !!config?.inline
  );

  console.log('shareableRef created', shareableRef);

  return globalThis.__shareableUnpacker(
    shareableRef,
    false
  ) as unknown as Shareable<TValue>;
}
