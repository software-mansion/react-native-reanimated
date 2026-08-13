'use strict';

import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { createSerializable } from './serializable';
import type {
  FixedSynchronizable,
  Synchronizable,
  SynchronizableConfig,
  SynchronizableRef,
} from './types';

export function createSynchronizable<TValue extends number | boolean>(
  initialValue: TValue,
  config: SynchronizableConfig & { fixedType: true }
): FixedSynchronizable<TValue extends boolean ? boolean : number>;

export function createSynchronizable<TValue = unknown>(
  initialValue: TValue,
  config?: SynchronizableConfig
): Synchronizable<TValue>;

export function createSynchronizable<TValue = unknown>(
  initialValue: TValue,
  config?: SynchronizableConfig
): Synchronizable<TValue> {
  const isFixed = !!config?.fixedType;

  if (
    __DEV__ &&
    isFixed &&
    !(typeof initialValue === 'number' || typeof initialValue === 'boolean')
  ) {
    throw new Error(
      '[Worklets] `fixedType` requires a number or boolean initial value.'
    );
  }

  const synchronizableRef = (
    isFixed
      ? WorkletsModule.createSynchronizableFixed(
          initialValue as number | boolean
        )
      : WorkletsModule.createSynchronizable(createSerializable(initialValue))
  ) as SynchronizableRef<TValue>;

  return globalThis.__synchronizableUnpacker(
    synchronizableRef,
    isFixed
  ) as unknown as Synchronizable<TValue>;
}
