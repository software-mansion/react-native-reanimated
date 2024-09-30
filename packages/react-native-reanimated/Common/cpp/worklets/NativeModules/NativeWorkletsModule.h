#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <worklets/NativeModules/NativeWorkletsModuleSpec.h>
#include <string>

namespace reanimated {

class NativeWorkletsModule : public NativeWorkletsModuleSpec {
 public:
  explicit NativeWorkletsModule(const std::string &valueUnpackerCode);

  ~NativeWorkletsModule();

  [[nodiscard]] inline std::string getValueUnpackerCode() const {
    return valueUnpackerCode_;
  }

 private:
  const std::string valueUnpackerCode_;
};

} // namespace reanimated
