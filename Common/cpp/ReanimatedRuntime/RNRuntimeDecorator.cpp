#include "RNRuntimeDecorator.h"
#include "ReanimatedVersion.h"

namespace reanimated {

void RNRuntimeDecorator::decorate(
    jsi::Runtime &rnRuntime,
    jsi::Runtime &uiRuntime,
    const bool isReducedMotion) {
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

  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

#ifdef RCT_NEW_ARCH_ENABLED
  constexpr auto isFabric = true;
#else
  constexpr auto isFabric = false;
#endif // RCT_NEW_ARCH_ENABLED
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", isFabric);

  auto version = getReanimatedVersionString(rnRuntime);
  rnRuntime.global().setProperty(rnRuntime, "_REANIMATED_VERSION_CPP", version);

  rnRuntime.global().setProperty(
      rnRuntime, "_REANIMATED_IS_REDUCED_MOTION", isReducedMotion);
}

} // namespace reanimated
