#pragma once

#include <worklets/Compat/ReactNativeCallInvoker.h>
#include <worklets/Tools/ThreadSafeQueue.h>

#include <atomic>

namespace worklets {

/**
 * Schedules jobs for FIFO execution on the UI thread.
 */
class UIScheduler {
 public:
  /**
   * Schedules a job for execution on the UI thread.
   *
   * A job submitted from another thread is queued and requests a UI-thread
   * drain. A job submitted from the UI thread executes inline only when no
   * drain is active and no older job is queued. Jobs submitted by that inline
   * job are queued for a later UI-thread turn.
   */
  virtual void scheduleOnUI(std::function<void()> job);

  bool isOnUIThread() const;

  virtual ~UIScheduler() = default;

 protected:
  /**
   * Drains all queued jobs in FIFO order on the UI thread. Jobs enqueued by a
   * running job are included in the active drain. Reentrant calls are ignored.
   * If a job throws, requestTrigger is called for the remaining jobs before the
   * exception is rethrown.
   */
  void triggerUI(const std::function<void()> &requestTrigger);

  virtual bool queryIsOnUIThread() const = 0;

  /**
   * Returns whether a newly scheduled job may safely execute inline without overtaking an older job or recursively
   * entering an active drain.
   */
  bool canInvokeSync() const;

  /**
   * Executes a job inline under the drain guard. Jobs submitted by the running
   * job remain queued, and requestTrigger is called after the guard is released
   * so that they run on a later UI-thread turn.
   */
  void invokeSync(const std::function<void()> &job, const std::function<void()> &requestTrigger);

  bool drainingUI_{false};
  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
};

} // namespace worklets
