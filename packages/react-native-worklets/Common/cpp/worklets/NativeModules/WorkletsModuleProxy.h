#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>
#include <worklets/AnimationFrameQueue/AnimationFrameBatchinator.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/SingleInstanceChecker.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

class WorkletsModuleProxy
    : public std::enable_shared_from_this<WorkletsModuleProxy> {
 public:
  explicit WorkletsModuleProxy(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<CallInvoker> &jsCallInvoker,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      std::function<void(std::function<void(const double)>)>
          &&forwardedRequestAnimationFrame);

  ~WorkletsModuleProxy();

  [[nodiscard]] inline std::shared_ptr<MessageQueueThread> getJSQueue() const {
    return jsQueue_;
  }

  [[nodiscard]] inline std::shared_ptr<JSScheduler> getJSScheduler() const {
    return jsScheduler_;
  }

  [[nodiscard]] inline std::shared_ptr<UIScheduler> getUIScheduler() const {
    return uiScheduler_;
  }

  [[nodiscard]] inline std::shared_ptr<WorkletRuntime> getUIWorkletRuntime()
      const {
    return uiWorkletRuntime_;
  }

  [[nodiscard]] std::shared_ptr<jsi::HostObject> createJSIWorkletsModuleProxy()
      const;

  [[nodiscard]] inline bool isDevBundle() const {
    return isDevBundle_;
  }

 private:
  const bool isDevBundle_;
  const std::shared_ptr<MessageQueueThread> jsQueue_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  std::shared_ptr<WorkletRuntime> uiWorkletRuntime_;
  std::shared_ptr<AnimationFrameBatchinator> animationFrameBatchinator_;
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModuleProxy> singleInstanceChecker_;
#endif // NDEBUG
};

} // namespace worklets
