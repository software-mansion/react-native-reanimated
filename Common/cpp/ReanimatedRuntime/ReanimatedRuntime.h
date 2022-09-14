#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;
using namespace react;

class ReanimatedRuntime {
  public:
    static std::shared_ptr<jsi::Runtime> make(
      std::shared_ptr<MessageQueueThread> jsQueue);
};

}
