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
  jsi_utils::installJsiFunction(
      rnRuntime,
      "_registriesLeakCheck",
      reanimatedModuleProxy->createRegistriesLeakCheck());
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

  const auto mapPrototype = rnRuntime.global()
                                .getProperty(rnRuntime, "Map")
                                .asObject(rnRuntime)
                                .asFunction(rnRuntime);

  rnRuntime.global().setProperty(
      rnRuntime, "__workletsCache", mapPrototype.callAsConstructor(rnRuntime));

  const auto weakMapPrototype = rnRuntime.global()
                                    .getProperty(rnRuntime, "WeakMap")
                                    .asObject(rnRuntime)
                                    .asFunction(rnRuntime);

  rnRuntime.global().setProperty(
      rnRuntime,
      "__handleCache",
      weakMapPrototype.callAsConstructor(rnRuntime));

  //   rnRuntime.global().setProperty(
  //       rnRuntime,
  //       "__shareableMappingCache",
  //       weakMapPrototype.callAsConstructor(rnRuntime));

  //   const auto symbolPrototype = rnRuntime.global()
  //                                    .getProperty(rnRuntime, "Symbol")
  //                                    .asObject(rnRuntime)
  //                                    .asFunction(rnRuntime);

  //   rnRuntime.global().setProperty(
  //       rnRuntime,
  //       "__shareableMappingFlag",
  //       symbolPrototype.call(
  //           rnRuntime,
  //           jsi::String::createFromAscii(rnRuntime, "shareable flag")));
}

} // namespace reanimated
