#include "RNRuntimeWorkletDecorator.h"

namespace reanimated {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CommonWorkletsModule> &commonWorkletsModule) {
  rnRuntime.global().setProperty(
      rnRuntime,
      "__workletsModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, commonWorkletsModule));
}

} // namespace reanimated
