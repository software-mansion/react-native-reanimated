#include "RNRuntimeWorkletDecorator.h"

namespace reanimated {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<NativeWorkletsModule> &NativeWorkletsModule) {
  rnRuntime.global().setProperty(
      rnRuntime,
      "__workletsModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, NativeWorkletsModule));
}

} // namespace reanimated
