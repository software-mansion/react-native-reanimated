#pragma once

#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

class ReanimatedWorkletRuntimeDecorator {
 public:
  static void decorate(jsi::Runtime &rt);
};

} // namespace reanimated
