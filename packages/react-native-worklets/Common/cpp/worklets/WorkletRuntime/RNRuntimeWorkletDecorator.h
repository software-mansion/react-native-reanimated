#pragma once

#include <jsi/jsi.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/Tools/JSLogger.h>
#include <memory>

using namespace facebook;

namespace worklets {

class RNRuntimeWorkletDecorator {
  // TODO: Rename to `RNRuntimeWorkletsDecorator` or something more suitable.
 public:
  static void
  decorate(jsi::Runtime &rnRuntime, jsi::Object &&jsiWorkletsModuleProxy, const std::shared_ptr<JSLogger> &jsLogger);

#ifdef IS_REANIMATED_EXAMPLE_APP
 private:
  static void installDebugBindings(jsi::Runtime &rnRuntime);
#endif // IS_REANIMATED_EXAMPLE_APP
};

} // namespace worklets
