'use strict';

/**
 * The below type is used for HostObjects returned by the JSI API that don't
 * have any accessible fields or methods but can carry data that is accessed
 * from the c++ side. We add a field to the type to make it possible for
 * typescript to recognize which JSI methods accept those types as arguments and
 * to be able to correctly type check other methods that may use them. However,
 * this field is not actually defined nor should be used for anything else as
 * assigning any data to those objects will throw an error.
 */
export type SerializableRef<T = unknown> = {
  __serializableRef: true;
  __nativeStateSerializableJSRef: T;
};

// In case of objects with depth or arrays of objects or arrays of arrays etc.
// we add this utility type that makes it a `SharaebleRef` of the outermost type.
export type FlatSerializableRef<T> =
  T extends SerializableRef<infer U> ? SerializableRef<U> : SerializableRef<T>;

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
  readonly name: string;
};

export type WorkletStackDetails = [
  error: Error,
  lineOffset: number,
  columnOffset: number,
];

export type WorkletClosure = Record<string, unknown>;

interface WorkletInitData {
  code: string;
  /** Only in dev builds. */
  location?: string;
  /** Only in dev builds. */
  sourceMap?: string;
}

interface WorkletProps {
  __closure: WorkletClosure;
  __workletHash: number;
  /** Only in Legacy Bundling. */
  __initData?: WorkletInitData;
  /** Only for Handles. */
  __init?: () => unknown;
  /** `__stackDetails` is removed after parsing. */
  __stackDetails?: WorkletStackDetails;
  /** Only in dev builds. */
  __pluginVersion?: string;
}

export type WorkletFunction<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
> = ((...args: TArgs) => TReturn) & WorkletProps;

export interface WorkletFactory<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
  TClosureVariables extends Record<string, unknown> = Record<string, unknown>,
> {
  (closureVariables: TClosureVariables): WorkletFunction<TArgs, TReturn>;
}

export type ValueUnpacker = WorkletFunction<
  [objectToUnpack: unknown, category?: string],
  unknown
>;

export interface WorkletImport {
  __bundleData: {
    /** Name of the module which is the source of the import. */
    source: string;
    /** The name of the imported value. */
    imported: string;
  };
}

export type SynchronizableRef<TValue = unknown> = {
  __synchronizableRef: true;
  __nativeStateSynchronizableJSRef: TValue;
};

export type Synchronizable<TValue = unknown> = SerializableRef<TValue> &
  SynchronizableRef<TValue> & {
    __synchronizableRef: true;
    getDirty(): TValue;
    getBlocking(): TValue;
    setBlocking(value: TValue | ((prev: TValue) => TValue)): void;
    lock(): void;
    unlock(): void;
  };

export type WorkletsError = Error & { name: 'Worklets' }; // signed type

export interface IWorkletsErrorConstructor extends Error {
  new (message?: string): WorkletsError;
  (message?: string): WorkletsError;
  readonly prototype: WorkletsError;
}

/** Configuration object for creating a worklet runtime. */
export type WorkletRuntimeConfig = {
  /** The name of the worklet runtime. */
  name?: string;
  /**
   * A worklet that will be run immediately after the runtime is created and
   * before any other worklets.
   */
  initializer?: () => void;
  /**
   * Time interval in milliseconds between polling of frame callbacks scheduled
   * by requestAnimationFrame. If not specified, it defaults to 16 ms.
   */
  animationQueuePollingRate?: number;
  /**
   * Determines whether to enable the default Event Loop or not. The Event Loop
   * provides implementations for `setTimeout`, `setImmediate`, `setInterval`,
   * `requestAnimationFrame`, `queueMicrotask`, `clearTimeout`, `clearInterval`,
   * `clearImmediate`, and `cancelAnimationFrame` methods. If not specified, it
   * defaults to `true`.
   */
  enableEventLoop?: true;
} & (
  | {
      /**
       * If true, the runtime will use the default queue implementation for
       * scheduling worklets. Defaults to true.
       */
      useDefaultQueue?: true;
      /**
       * An optional custom queue to be used for scheduling worklets.
       *
       * The queue has to implement the C++ `AsyncQueue` interface from
       * `<worklets/Public/AsyncQueue.h>`.
       */
      customQueue?: never;
    }
  | {
      /**
       * If true, the runtime will use the default queue implementation for
       * scheduling worklets. Defaults to true.
       */
      useDefaultQueue: false;
      /**
       * An optional custom queue to be used for scheduling worklets.
       *
       * The queue has to implement the C++ `AsyncQueue` interface from
       * `<worklets/Public/AsyncQueue.h>`.
       */
      customQueue?: object;
    }
);
