#pragma once

#include "JSScheduler.h"

#include <memory>
#include <string>

namespace reanimated {

class WorkletRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rt,
      const std::string &name,
      const std::shared_ptr<JSScheduler> &jsScheduler);
};

} // namespace reanimated
