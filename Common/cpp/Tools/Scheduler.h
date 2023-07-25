#pragma once

#include <ReactCommon/CallInvoker.h>

#include <condition_variable>
#include <functional>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <utility>

#include "ThreadSafeQueue.h"

namespace reanimated {

class RuntimeManager;

class Scheduler {
 public:
  void scheduleOnJS(std::function<void()> job);
  void setJSCallInvoker(
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker);
  void setRuntimeManager(std::shared_ptr<RuntimeManager> runtimeManager);
  virtual void scheduleOnUI(std::function<void()> job);
  virtual void triggerUI();
  virtual ~Scheduler();

 protected:
  std::atomic<bool> scheduledOnUI_{false};
  ThreadSafeQueue<std::function<void()>> uiJobs_;
  std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker_;
  std::weak_ptr<RuntimeManager> weakRuntimeManager_;
};

} // namespace reanimated
