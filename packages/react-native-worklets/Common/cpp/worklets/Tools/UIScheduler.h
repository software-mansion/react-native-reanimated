#pragma once

#include <worklets/Tools/ThreadSafeQueue.h>

#include <worklets/Compat/ReactNativeCallInvoker.h>

#include <atomic>

namespace worklets {

class UIScheduler {
 public:
  virtual void scheduleOnUI(std::function<void()> job);
  bool isOnUIThread() const;
  virtual ~UIScheduler() = default;

 protected:
  /**
   * Drains all queued jobs in FIFO order on the UI thread. Jobs enqueued by a
   * running job are included in the active drain. Reentrant calls are ignored.
   */
  void triggerUI();

  virtual bool queryIsOnUIThread() const = 0;

  bool drainingUI_{false};
  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
};

} // namespace worklets
