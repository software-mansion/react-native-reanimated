#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <worklets/NativeModules/NativeWorkletsModuleSpec.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <memory>
#include <string>

namespace worklets {

class NativeWorkletsModule : public NativeWorkletsModuleSpec {
 public:
  explicit NativeWorkletsModule(
      const std::string &valueUnpackerCode,
      const std::shared_ptr<MessageQueueThread> &jsQueue);

  ~NativeWorkletsModule();

  [[nodiscard]] inline std::string getValueUnpackerCode() const {
    return valueUnpackerCode_;
  }

  [[nodiscard]] inline std::shared_ptr<MessageQueueThread> getJSQueue() const {
    return jsQueue_;
  }

 private:
  const std::string valueUnpackerCode_;
  const std::shared_ptr<MessageQueueThread> jsQueue_;
};

} // namespace worklets
