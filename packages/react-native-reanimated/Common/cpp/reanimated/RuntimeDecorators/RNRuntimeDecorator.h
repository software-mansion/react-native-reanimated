#pragma once

#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <jsi/jsi.h>

#include <memory>

using namespace facebook;

namespace reanimated {

class RNRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rnRuntime,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<ReanimatedModuleProxy> &reanimatedModuleProxy);
};

} // namespace reanimated
