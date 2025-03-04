#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>

namespace worklets {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy) {
  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

  // TODO: Remove _IS_FABRIC sometime in the future
  // react-native-screens 4.9.0 depends on it
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", true);

  rnRuntime.global().setProperty(
      rnRuntime,
      "__workletsModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, workletsModuleProxy));
}

} // namespace worklets
