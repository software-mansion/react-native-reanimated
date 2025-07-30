/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<9eba9771ca89332ec9d728d7cc4c2466>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Interaction/InteractionManager.js
 */

import type { EventSubscription } from "../vendor/emitter/EventEmitter";
import type { Task } from "./TaskQueue";
export type { Task, SimpleTask, PromiseTask } from "./TaskQueue";
export type Handle = number;
/**
 * InteractionManager allows long-running work to be scheduled after any
 * interactions/animations have completed. In particular, this allows JavaScript
 * animations to run smoothly.
 *
 * Applications can schedule tasks to run after interactions with the following:
 *
 * ```
 * InteractionManager.runAfterInteractions(() => {
 *   // ...long-running synchronous task...
 * });
 * ```
 *
 * Compare this to other scheduling alternatives:
 *
 * - requestAnimationFrame(): for code that animates a view over time.
 * - setImmediate/setTimeout(): run code later, note this may delay animations.
 * - runAfterInteractions(): run code later, without delaying active animations.
 *
 * The touch handling system considers one or more active touches to be an
 * 'interaction' and will delay `runAfterInteractions()` callbacks until all
 * touches have ended or been cancelled.
 *
 * InteractionManager also allows applications to register animations by
 * creating an interaction 'handle' on animation start, and clearing it upon
 * completion:
 *
 * ```
 * var handle = InteractionManager.createInteractionHandle();
 * // run animation... (`runAfterInteractions` tasks are queued)
 * // later, on animation completion:
 * InteractionManager.clearInteractionHandle(handle);
 * // queued tasks run if all handles were cleared
 * ```
 *
 * `runAfterInteractions` takes either a plain callback function, or a
 * `PromiseTask` object with a `gen` method that returns a `Promise`.  If a
 * `PromiseTask` is supplied, then it is fully resolved (including asynchronous
 * dependencies that also schedule more tasks via `runAfterInteractions`) before
 * starting on the next task that might have been queued up synchronously
 * earlier.
 *
 * By default, queued tasks are executed together in a loop in one
 * `setImmediate` batch. If `setDeadline` is called with a positive number, then
 * tasks will only be executed until the deadline (in terms of js event loop run
 * time) approaches, at which point execution will yield via setTimeout,
 * allowing events such as touches to start interactions and block queued tasks
 * from executing, making apps more responsive.
 */
declare const InteractionManagerImpl: {
  Events: {
    interactionStart: "interactionStart";
    interactionComplete: "interactionComplete";
  };
  /**
   * Schedule a function to run after all interactions have completed. Returns a cancellable
   * "promise".
   */
  runAfterInteractions(task: null | undefined | Task): {
    then: <U>(onFulfill?: (($$PARAM_0$$: void) => (Promise<U> | U) | undefined) | undefined, onReject?: ((error: unknown) => (Promise<U> | U) | undefined) | undefined) => Promise<U>;
    cancel: () => void;
  };
  /**
   * Notify manager that an interaction has started.
   */
  createInteractionHandle(): Handle;
  /**
   * Notify manager that an interaction has completed.
   */
  clearInteractionHandle(handle: Handle): void;
  addListener: (eventType: string, listener: (...args: any) => unknown, context: unknown) => EventSubscription;
  /**
   * A positive number will use setTimeout to schedule any tasks after the
   * eventLoopRunningTime hits the deadline value, otherwise all tasks will be
   * executed in one setImmediate batch (default).
   */
  setDeadline(deadline: number): void;
};
declare const InteractionManager: typeof InteractionManagerImpl;
declare const $$InteractionManager: typeof InteractionManager;
declare type $$InteractionManager = typeof $$InteractionManager;
export default $$InteractionManager;
