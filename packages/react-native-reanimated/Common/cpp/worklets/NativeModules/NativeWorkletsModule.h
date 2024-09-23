#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <string>
#include "NativeWorkletsModuleSpec.h"

namespace reanimated {

class NativeWorkletsModule : public NativeWorkletsModuleSpec {
 public:
  NativeWorkletsModule(const std::string &valueUnpackerCode);

  ~NativeWorkletsModule();

  [[nodiscard]] std::string getValueUnpackerCode() const;

 private:
  const std::string valueUnpackerCode_;
};

} // namespace reanimated
