#include <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#include <reanimated/Tools/ReanimatedVersion.h>
#include <worklets/Tools/WorkletsJSIUtils.h>

namespace reanimated {

void RNRuntimeDecorator::decorate(
    jsi::Runtime &rnRuntime,
    jsi::Runtime &uiRuntime,
    const std::shared_ptr<ReanimatedModuleProxy> &reanimatedModuleProxy) {
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

#ifndef NDEBUG
  checkJSVersion(rnRuntime, reanimatedModuleProxy->getJSLogger());
#endif // NDEBUG

#ifdef IS_REANIMATED_EXAMPLE_APP
  installDebugBindings(rnRuntime, reanimatedModuleProxy);
#endif // IS_REANIMATED_EXAMPLE_APP

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

#ifdef IS_REANIMATED_EXAMPLE_APP
void RNRuntimeDecorator::installDebugBindings(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<ReanimatedModuleProxy> &reanimatedModuleProxy) {
#if TARGET_OS_X
  jsi_utils::installJsiFunction(
      rnRuntime,
      "__getTagFromShadowNodeWrapper",
      [](jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper) {
        auto node = Bridging<std::shared_ptr<const ShadowNode>>::fromJs(
            rt, shadowNodeWrapper);
        return jsi::Value(rt, static_cast<double>(node->getTag()));
      });
#endif // TARGET_OS_X

  jsi_utils::installJsiFunction(
      rnRuntime,
      "_registriesLeakCheck",
      reanimatedModuleProxy->createRegistriesLeakCheck());
}
#endif // IS_REANIMATED_EXAMPLE_APP

} // namespace reanimated
