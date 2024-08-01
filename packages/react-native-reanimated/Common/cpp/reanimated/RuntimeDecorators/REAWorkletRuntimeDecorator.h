#pragma once

#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

class REAWorkletRuntimeDecorator {
 public:
  static void decorate(jsi::Runtime &rt);
};

} // namespace reanimated
