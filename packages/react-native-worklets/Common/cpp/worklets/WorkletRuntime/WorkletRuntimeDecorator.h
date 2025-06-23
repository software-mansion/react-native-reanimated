#pragma once

#include <worklets/Tools/JSScheduler.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>

using namespace facebook;

namespace worklets {

class WorkletRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rt,
      const std::string &name,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      jsi::Object &&jsiWorkletsModuleProxy);
};

} // namespace worklets
