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

  /**
   * Use it to schedule a function to be executed after all
   * `requestAnimationFrame` callbacks but before the next frame is rendered.
   * This is useful to collect all updates which happened when the animation
   * frame queue was flushed.
   *
   * **Available only on the UI Runtime.**
   */
  var requestAnimationFrameFinalizer: (callback: () => void) => void;
}

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
  readonly name: string;
  readonly runtimeId: number;
};

export type WorkletStackDetails = [
  error: Error,
  lineOffset: number,
  columnOffset: number,
];

type WorkletClosure = Record<string, unknown>;

interface WorkletInitData {
  /** Only when bytecode isn't toggled. */
  code?: string;
  /** Only in production builds and explicitly toggled. */
  bytecode?: ArrayBuffer;
  /** Only in dev builds. */
  location?: string;
  /** Only in dev builds. */
  sourceMap?: string;
}

interface WorkletProps {
  __closure: WorkletClosure;
  __workletHash: number;
  /** Only in Legacy Eval Mode. */
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

type WorkletRuntimeConfigBase = {
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
};

/** Configuration object for creating a worklet runtime. */
export type WorkletRuntimeConfig = WorkletRuntimeConfigBase &
  (
    | {
        /**
         * Determines whether to enable the default Event Loop, which provides
         * `setTimeout`, `setInterval`, `requestAnimationFrame` and other
         * scheduling APIs. If not specified, it defaults to `true`. Cannot be
         * enabled when {@link enableLocking} is set to `false`.
         */
        enableEventLoop?: boolean;
        /**
         * Determines whether access to the underlying JS runtime is
         * synchronized with a mutex around every JSI operation. If not
         * specified, it defaults to `true`. Can be disabled only together
         * with the Event Loop.
         */
        enableLocking?: true;
      }
    | {
        /**
         * The Event Loop cannot be enabled on a runtime with
         * {@link enableLocking} set to `false`.
         */
        enableEventLoop?: false;
        /**
         * Determines whether access to the underlying JS runtime is
         * synchronized with a mutex around every JSI operation.
         *
         * When set to `false`, the runtime takes no locks and is created
         * without the Event Loop — asynchronous APIs like timers or Promise
         * continuations are unavailable. Custom serializables registered and
         * module updates made after the runtime's creation aren't applied to
         * it. Synchronizing access to the runtime is the caller's
         * responsibility.
         */
        enableLocking: false;
      }
  ) &
  (
    | {
        /**
         * The queue used for scheduling worklets on this runtime.
         *
         * - `'default'` (the default): use the built-in queue implementation.
         * - An object implementing the C++ `AsyncQueue` interface from
         *   `<worklets/RunLoop/AsyncQueue.h>`: use the provided custom queue.
         * - `null`: do not attach any queue to the runtime.
         */
        queue?: 'default' | object | null;
        useDefaultQueue?: never;
        customQueue?: never;
      }
    | {
        queue?: never;
        /** @deprecated Use {@link queue} instead. */
        useDefaultQueue?: true;
        /** @deprecated Use {@link queue} instead. */
        customQueue?: never;
      }
    | {
        queue?: never;
        /** @deprecated Use {@link queue} instead. */
        useDefaultQueue: false;
        /** @deprecated Use {@link queue} instead. */
        customQueue?: object;
      }
  );
