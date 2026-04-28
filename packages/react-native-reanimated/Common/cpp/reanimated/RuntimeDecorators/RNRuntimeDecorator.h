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

#ifdef IS_REANIMATED_EXAMPLE_APP
 private:
  static void installDebugBindings(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<ReanimatedModuleProxy> &reanimatedModuleProxy);
#endif // IS_REANIMATED_EXAMPLE_APP
};

} // namespace reanimated
