#pragma once

#include <jsi/jsi.h>

#include <memory>

#include "CommonWorkletsModule.h"

using namespace facebook;

namespace reanimated {

class RNRuntimeWorkletDecorator {
 public:
  static void decorate(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<CommonWorkletsModule> &commonWorkletsModule);
};

} // namespace reanimated