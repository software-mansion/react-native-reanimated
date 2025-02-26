#pragma once

#include <worklets/Tools/ThreadSafeQueue.h>

#include <ReactCommon/CallInvoker.h>

#include <atomic>

namespace worklets {

class UIScheduler {
 public:
  virtual void scheduleOnUI(std::function<void()> job);
  virtual void triggerUI();
  virtual ~UIScheduler() = default;

 protected:
  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
};

} // namespace worklets
