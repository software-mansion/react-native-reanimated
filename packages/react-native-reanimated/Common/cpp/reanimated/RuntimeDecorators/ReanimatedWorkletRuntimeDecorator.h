#pragma once

#include <jsi/jsi.h>

namespace reanimated {

class ReanimatedWorkletRuntimeDecorator {
 public:
  static void decorate(facebook::jsi::Runtime &rt);
};

} // namespace reanimated
