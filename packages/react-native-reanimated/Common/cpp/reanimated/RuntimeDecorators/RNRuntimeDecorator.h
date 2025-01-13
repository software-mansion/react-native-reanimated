#pragma once

#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <worklets/Tools/ReanimatedVersion.h>

#include <jsi/jsi.h>

#include <memory>

using namespace facebook;

namespace reanimated {

class RNRuntimeDecorator {
 public:
  template <class TReanimatedModuleProxy>
  static void decorate(
      jsi::Runtime *pRnRuntime,
      jsi::Runtime *uiRuntime,
      const std::shared_ptr<TReanimatedModuleProxy> &reanimatedModuleProxy) {
    auto &rnRuntime = *pRnRuntime;

    auto workletRuntimeValue =
        rnRuntime.global()
            .getPropertyAsObject(rnRuntime, "ArrayBuffer")
            .asFunction(rnRuntime)
            .callAsConstructor(
                rnRuntime, {static_cast<double>(sizeof(void *))});
    uintptr_t *workletRuntimeData = reinterpret_cast<uintptr_t *>(
        workletRuntimeValue.getObject(rnRuntime).getArrayBuffer(rnRuntime).data(
            rnRuntime));
    workletRuntimeData[0] = reinterpret_cast<uintptr_t>(&uiRuntime);
    rnRuntime.global().setProperty(
        rnRuntime, "_WORKLET_RUNTIME", workletRuntimeValue);

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
};

} // namespace reanimated
