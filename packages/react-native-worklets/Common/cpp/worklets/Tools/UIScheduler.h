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
   * A job submitted from the UI thread executes inline when no drain is active and no older job is queued.
   */
  virtual void scheduleOnUI(std::function<void()> job);

  /**
   * Drains all queued jobs in FIFO order. Must be called on the UI thread. Jobs enqueued by a running job are included
   * in the active drain. Reentrant calls are ignored.
   */
  virtual void triggerUI();

  bool isOnUIThread() const;

  virtual ~UIScheduler() = default;

 protected:
  virtual bool queryIsOnUIThread() const = 0;

  /**
   * Returns whether a newly scheduled job may safely execute inline without overtaking an older job or recursively
   * entering an active drain.
   */
  bool canInvokeSync() const;

  bool drainingUI_{false};
  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
};

} // namespace worklets
