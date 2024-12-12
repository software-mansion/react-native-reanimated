#include <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#include <worklets/Tools/ReanimatedVersion.h>

namespace reanimated {

void RNRuntimeDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<ReanimatedModuleProxy> &reanimatedModuleProxy) {
  jsi::Runtime &uiRuntime = reanimatedModuleProxy->getUIRuntime();
  auto workletRuntimeValue =
      rnRuntime.global()
          .getPropertyAsObject(rnRuntime, "ArrayBuffer")
          .asFunction(rnRuntime)
          .callAsConstructor(rnRuntime, {static_cast<double>(sizeof(void *))});
  uintptr_t *workletRuntimeData = reinterpret_cast<uintptr_t *>(
      workletRuntimeValue.getObject(rnRuntime).getArrayBuffer(rnRuntime).data(
          rnRuntime));
  workletRuntimeData[0] = reinterpret_cast<uintptr_t>(&uiRuntime);
  rnRuntime.global().setProperty(
      rnRuntime, "_WORKLET_RUNTIME", workletRuntimeValue);

#ifdef RCT_NEW_ARCH_ENABLED
  constexpr auto isFabric = true;
#else
  constexpr auto isFabric = false;
#endif // RCT_NEW_ARCH_ENABLED
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", isFabric);

  rnRuntime.global().setProperty(
      rnRuntime, "_IS_BRIDGELESS", reanimatedModuleProxy->isBridgeless());

#ifndef NDEBUG
  checkJSVersion(rnRuntime, reanimatedModuleProxy->getJSLogger());
#endif // NDEBUG
  injectReanimatedCppVersion(rnRuntime);

  rnRuntime.global().setProperty(
      rnRuntime,
      "_REANIMATED_IS_REDUCED_MOTION",
      reanimatedModuleProxy->isReducedMotion());

  rnRuntime.global().setProperty(
      rnRuntime,
      "__reanimatedModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, reanimatedModuleProxy));
}

} // namespace reanimated
