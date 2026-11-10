#pragma once

#include <worklets/Tools/ThreadSafeQueue.h>

#if __has_include(<React/CallInvoker.h>)
#include <React/CallInvoker.h>
#else
#include <ReactCommon/CallInvoker.h>
#endif

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

  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
};

} // namespace worklets
