#pragma once

#include <jsi/jsi.h>

#include <memory>

#include "CommonReanimatedModule.h"

using namespace facebook;

namespace reanimated {

class RNRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<CommonReanimatedModule> &commonReanimatedModule,
      const bool isReducedMotion);
};

} // namespace reanimated
