#pragma once

#include <cxxreact/MessageQueueThread.h>
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
      const std::string &valueUnpackerCode,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<CallInvoker> &jsCallInvoker,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler);

  ~WorkletsModuleProxy();

  jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) override;

  [[nodiscard]] inline std::string getValueUnpackerCode() const {
    return valueUnpackerCode_;
  }

  [[nodiscard]] inline std::shared_ptr<MessageQueueThread> getJSQueue() const {
    return jsQueue_;
  }

  [[nodiscard]] inline std::shared_ptr<JSScheduler> getJSScheduler() const {
    return jsScheduler_;
  }

  [[nodiscard]] inline std::shared_ptr<UIScheduler> getUIScheduler() const {
    return uiScheduler_;
  }

 private:
  const std::string valueUnpackerCode_;
  const std::shared_ptr<MessageQueueThread> jsQueue_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModuleProxy> singleInstanceChecker_;
#endif // NDEBUG
};

} // namespace worklets
