#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>

namespace worklets {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy) {
  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

  // TODO: Remove _IS_FABRIC sometime in the future
  // react-native-screens 4.9.0 depends on it
#ifdef RCT_NEW_ARCH_ENABLED
  constexpr auto isFabric = true;
#else
  constexpr auto isFabric = false;
#endif // RCT_NEW_ARCH_ENABLED
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", isFabric);

  rnRuntime.global().setProperty(
      rnRuntime,
      "__workletsModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, workletsModuleProxy));
}

} // namespace worklets
