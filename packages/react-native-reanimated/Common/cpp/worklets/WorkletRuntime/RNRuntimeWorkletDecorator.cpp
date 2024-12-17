#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>

namespace worklets {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy) {
  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

  rnRuntime.global().setProperty(
      rnRuntime,
      "__workletsModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, workletsModuleProxy));
}

} // namespace worklets
