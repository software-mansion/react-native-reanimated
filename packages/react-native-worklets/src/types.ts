/* eslint-disable reanimated/use-global-this */
'use strict';

import type { RuntimeKind } from './runtimeKind';

/** Public globals to be exposed to the user. */
declare global {
  /**
   * @deprecated Use {@link __RUNTIME_KIND} instead.
   *
   *   This global variable is a diagnostic/development tool.
   *
   *   It's `true` on Worklet Runtimes and `false` on React Native Runtime.
   */
  var _WORKLET: boolean | undefined;

  /**
   * This ArrayBuffer contains the memory address of `jsi::Runtime` which is the
   * Reanimated UI runtime.
   */
  var _WORKLET_RUNTIME: ArrayBuffer;

  /** @deprecated Don't use. */
  var _IS_FABRIC: boolean | undefined;

  /**
   * This global variable is used to determine the kind of the current runtime.
   * You can use it directly to differentiate between runtimes. However, the
   * recommended way for differentiating is to use the {@link getRuntimeKind}
   * function.
   *
   * - Value _1_: React Native Runtime
   * - Value _2_: UI Worklet Runtime
   * - Value _3_: Worker Worklet Runtime
   */
  var __RUNTIME_KIND: RuntimeKind | 1 | 2 | 3;
}

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
       * `<worklets/RunLoop/AsyncQueue.h>`.
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
       * `<worklets/RunLoop/AsyncQueue.h>`.
       */
      customQueue?: object;
    }
);
