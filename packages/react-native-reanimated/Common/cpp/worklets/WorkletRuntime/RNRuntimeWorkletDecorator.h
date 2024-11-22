#pragma once

#include <jsi/jsi.h>
#include <worklets/NativeModules/NativeWorkletsModule.h>
#include <memory>

using namespace facebook;

namespace worklets {

class RNRuntimeWorkletDecorator {
  // TODO: Rename to `RNRuntimeWorkletsDecorator` or something more suitable.
 public:
  static void decorate(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<NativeWorkletsModule> &nativeWorkletsModule);
};

} // namespace worklets
