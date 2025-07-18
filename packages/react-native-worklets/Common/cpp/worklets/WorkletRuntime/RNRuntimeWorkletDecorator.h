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
  static void decorate(
      jsi::Runtime &rnRuntime,
      jsi::Object &&jsiWorkletsModuleProxy,
      const std::shared_ptr<JSLogger> &jsLogger);
};

} // namespace worklets
