#include <worklets/NativeModules/WorkletsModuleProxySpec.h>

#include <utility>

#define WORKLETS_SPEC_PREFIX(FN_NAME) \
  __hostFunction_WorkletsModuleProxySpec_##FN_NAME

namespace worklets {

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableClone)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableClone(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

static jsi::Value WORKLETS_SPEC_PREFIX(scheduleOnUI)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->scheduleOnUI(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value WORKLETS_SPEC_PREFIX(executeOnUIRuntimeSync)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->executeOnUIRuntimeSync(rt, std::move(args[0]));
}

static jsi::Value WORKLETS_SPEC_PREFIX(createWorkletRuntime)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->createWorkletRuntime(rt, std::move(args[0]), std::move(args[1]));
}

static jsi::Value WORKLETS_SPEC_PREFIX(scheduleOnRuntime)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->scheduleOnRuntime(rt, std::move(args[0]), std::move(args[1]));
}

WorkletsModuleProxySpec::WorkletsModuleProxySpec(
    const std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("NativeWorklets", jsInvoker) {
  methodMap_["makeShareableClone"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(makeShareableClone)};
  methodMap_["scheduleOnUI"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(scheduleOnUI)};
  methodMap_["executeOnUIRuntimeSync"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(executeOnUIRuntimeSync)};
  methodMap_["createWorkletRuntime"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(createWorkletRuntime)};
  methodMap_["scheduleOnRuntime"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(scheduleOnRuntime)};
}

} // namespace worklets
