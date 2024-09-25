#pragma once

#include <reanimated/NativeModules/NativeReanimatedModule.h>

#include <jsi/jsi.h>

#include <memory>

using namespace facebook;

namespace reanimated {

class RNRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<NativeReanimatedModule> &nativeReanimatedModule);
};

} // namespace reanimated
