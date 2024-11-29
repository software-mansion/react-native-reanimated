#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <worklets/NativeModules/WorkletsModuleProxySpec.h>
#include <worklets/Tools/SingleInstanceChecker.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <memory>
#include <string>

namespace worklets {

class WorkletsModuleProxy : public WorkletsModuleProxySpec {
 public:
  explicit WorkletsModuleProxy(
      const std::string &valueUnpackerCode,
      const std::shared_ptr<MessageQueueThread> &jsQueue);

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

 private:
  const std::string valueUnpackerCode_;
  const std::shared_ptr<MessageQueueThread> jsQueue_;
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModuleProxy> singleInstanceChecker_;
#endif // NDEBUG
};

} // namespace worklets
