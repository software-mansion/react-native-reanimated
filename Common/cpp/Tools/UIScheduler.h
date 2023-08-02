#pragma once

#include <ReactCommon/CallInvoker.h>

#include <memory>

#include "ThreadSafeQueue.h"

namespace reanimated {

class RuntimeManager;

class UIScheduler {
 public:
  void setRuntimeManager(const std::shared_ptr<RuntimeManager> &runtimeManager);
  virtual void scheduleOnUI(std::function<void()> job);
  virtual void triggerUI();
  virtual ~UIScheduler();

 protected:
  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
  std::weak_ptr<RuntimeManager> weakRuntimeManager_;
};

} // namespace reanimated
