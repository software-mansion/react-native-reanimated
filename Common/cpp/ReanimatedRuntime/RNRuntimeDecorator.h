#pragma once

#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

class RNRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rnRuntime,
      jsi::Runtime &uiRuntime,
      const bool isReducedMotion);
};

} // namespace reanimated
