#pragma once

#include <worklets/Tools/ThreadSafeQueue.h>

#include <worklets/Compat/ReactNativeCallInvoker.h>

#include <atomic>

namespace worklets {

class UIScheduler {
 public:
  virtual void scheduleOnUI(std::function<void()> job);
  virtual void triggerUI();
  bool isOnUIThread() const;
  virtual ~UIScheduler() = default;

 protected:
  virtual bool queryIsOnUIThread() const = 0;
  // Must be called on the UI thread. Returns false if the job still has to be queued with a trigger.
  bool scheduleOnUIFromUIThread(std::function<void()> &job);

  bool drainingUI_{false};
  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
};

} // namespace worklets
