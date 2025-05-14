#include <jsi/jsi.h>
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

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableString)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableString(rt, std::move(args[0]).asString(rt));
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableNumber)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableNumber(rt, std::move(args[0]).asNumber());
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableBoolean)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableBoolean(rt, std::move(args[0]).asBool());
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableBigInt)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableBigInt(rt, std::move(args[0]).asBigInt(rt));
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableUndefined)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableUndefined(rt);
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableNull)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableNull(rt);
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableArray)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableArray(
          rt, std::move(args[0]).asObject(rt).asArray(rt), std::move(args[1]));
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableObject)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableObject(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableHostObject)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableHostObject(rt, std::move(args[0]));
}

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableInitializer)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableInitializer(rt, std::move(args[0]).asObject(rt));
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

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableFunction)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<WorkletsModuleProxySpec *>(&turboModule)
      ->makeShareableFunction(rt, std::move(args[0]));
}

WorkletsModuleProxySpec::WorkletsModuleProxySpec(
    const std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("NativeWorklets", jsInvoker) {
  methodMap_["makeShareableClone"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(makeShareableClone)};
  methodMap_["makeShareableString"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(makeShareableString)};
  methodMap_["makeShareableNumber"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(makeShareableNumber)};
  methodMap_["makeShareableBoolean"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(makeShareableBoolean)};
  methodMap_["makeShareableBigInt"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(makeShareableBigInt)};
  methodMap_["makeShareableArray"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(makeShareableArray)};
  methodMap_["makeShareableObject"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(makeShareableObject)};
  methodMap_["makeShareableHostObject"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(makeShareableHostObject)};
  methodMap_["makeShareableInitializer"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(makeShareableInitializer)};
  methodMap_["makeShareableUndefined"] =
      MethodMetadata{0, WORKLETS_SPEC_PREFIX(makeShareableUndefined)};
  methodMap_["makeShareableNull"] =
      MethodMetadata{0, WORKLETS_SPEC_PREFIX(makeShareableNull)};
  methodMap_["scheduleOnUI"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(scheduleOnUI)};
  methodMap_["executeOnUIRuntimeSync"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(executeOnUIRuntimeSync)};
  methodMap_["createWorkletRuntime"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(createWorkletRuntime)};
  methodMap_["scheduleOnRuntime"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(scheduleOnRuntime)};
  methodMap_["makeShareableFunction"] =
      MethodMetadata{1, WORKLETS_SPEC_PREFIX(makeShareableFunction)};
}

} // namespace worklets
