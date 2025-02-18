#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

#include <memory>
#include <string>

namespace worklets {

using namespace facebook;
using namespace react;

class ReanimatedRuntime {
 public:
  static std::shared_ptr<jsi::Runtime> make(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::string &name);
};

} // namespace worklets
