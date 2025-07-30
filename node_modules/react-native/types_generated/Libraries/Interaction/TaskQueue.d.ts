/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<d852c920b6dda122586717847bb5d05a>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Interaction/TaskQueue.js
 */

export type SimpleTask = {
  name: string;
  run: () => void;
};
export type PromiseTask = {
  name: string;
  gen: () => Promise<void>;
};
export type Task = SimpleTask | PromiseTask | (() => void);
/**
 * TaskQueue - A system for queueing and executing a mix of simple callbacks and
 * trees of dependent tasks based on Promises. No tasks are executed unless
 * `processNext` is called.
 *
 * `enqueue` takes a Task object with either a simple `run` callback, or a
 * `gen` function that returns a `Promise` and puts it in the queue.  If a gen
 * function is supplied, then the promise it returns will block execution of
 * tasks already in the queue until it resolves. This can be used to make sure
 * the first task is fully resolved (including asynchronous dependencies that
 * also schedule more tasks via `enqueue`) before starting on the next task.
 * The `onMoreTasks` constructor argument is used to inform the owner that an
 * async task has resolved and that the queue should be processed again.
 *
 * Note: Tasks are only actually executed with explicit calls to `processNext`.
 */
declare class TaskQueue {
  constructor($$PARAM_0$$: {
    onMoreTasks: () => void;
  });
  enqueue(task: Task): void;
  enqueueTasks(tasks: Array<Task>): void;
  cancelTasks(tasksToCancel: Array<Task>): void;
  hasTasksToProcess(): boolean;
  processNext(): void;
}
export default TaskQueue;
