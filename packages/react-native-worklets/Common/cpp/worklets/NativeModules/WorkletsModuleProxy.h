#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <worklets/AnimationFrameQueue/AnimationFrameBatchinator.h>
#include <worklets/NativeModules/WorkletsModuleProxySpec.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/SingleInstanceChecker.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <string>

namespace worklets {

class WorkletsModuleProxy
    : public WorkletsModuleProxySpec,
      public std::enable_shared_from_this<WorkletsModuleProxy> {
 public:
  explicit WorkletsModuleProxy(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<CallInvoker> &jsCallInvoker,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      std::function<void(std::function<void(const double)>)>
          &&forwardedRequestAnimationFrame);

  ~WorkletsModuleProxy() override;

  jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) override;

  jsi::Value makeShareableString(jsi::Runtime &rt, const jsi::String &string)
      override;

  jsi::Value makeShareableNumber(jsi::Runtime &rt, double number) override;

  jsi::Value makeShareableBoolean(jsi::Runtime &rt, bool boolean) override;

  jsi::Value makeShareableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint)
      override;

  void scheduleOnUI(jsi::Runtime &rt, const jsi::Value &worklet) override;

  jsi::Value executeOnUIRuntimeSync(jsi::Runtime &rt, const jsi::Value &worklet)
      override;

  jsi::Value createWorkletRuntime(
      jsi::Runtime &rt,
      const jsi::Value &name,
      const jsi::Value &initializer) override;

  jsi::Value scheduleOnRuntime(
      jsi::Runtime &rt,
      const jsi::Value &workletRuntimeValue,
      const jsi::Value &shareableWorkletValue) override;

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
