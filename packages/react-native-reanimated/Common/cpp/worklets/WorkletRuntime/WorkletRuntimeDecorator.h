#pragma once

#include <worklets/Tools/JSScheduler.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>

namespace worklets {

class WorkletRuntimeDecorator {
 public:
  static void decorate(
      facebook::jsi::Runtime &rt,
      const std::string &name,
      const std::shared_ptr<JSScheduler> &jsScheduler);
};

} // namespace worklets
