#pragma once

namespace worklets {

/**
 * State of the task that currently runs on a Worklet Runtime. It is shared by
 * the WorkletRuntime and its EventLoop and must be accessed only by the code
 * that currently executes on the runtime.
 */
struct RuntimeTaskState {
  /**
   * True while a call into the runtime is in progress. A call that finds it
   * set is nested in another call and leaves the microtask checkpoint to the
   * outermost one.
   */
  bool rootTaskRunning{false};
  /**
   * True when the outermost call or a call nested in it requested a microtask
   * checkpoint. The outermost call runs the checkpoint when it completes.
   */
  bool microtaskCheckpointRequested{false};
};

} // namespace worklets
