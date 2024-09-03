#include "NativeWorkletsModuleSpec.h"

#include <utility>

#define SPEC_PREFIX(FN_NAME) __hostFunction_NativeWorkletsModuleSpec_##FN_NAME

namespace reanimated {

// SharedValue

static jsi::Value SPEC_PREFIX(makeShareableClone)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<NativeWorkletsModuleSpec *>(&turboModule)
      ->makeShareableClone(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

// scheduler

static jsi::Value SPEC_PREFIX(scheduleOnUI)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<NativeWorkletsModuleSpec *>(&turboModule)
      ->scheduleOnUI(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value SPEC_PREFIX(executeOnUIRuntimeSync)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<NativeWorkletsModuleSpec *>(&turboModule)
      ->executeOnUIRuntimeSync(rt, std::move(args[0]));
}

static jsi::Value SPEC_PREFIX(createWorkletRuntime)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<NativeWorkletsModuleSpec *>(&turboModule)
      ->createWorkletRuntime(rt, std::move(args[0]), std::move(args[1]));
}

static jsi::Value SPEC_PREFIX(scheduleOnRuntime)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<NativeWorkletsModuleSpec *>(&turboModule)
      ->scheduleOnRuntime(rt, std::move(args[0]), std::move(args[1]));
}

NativeWorkletsModuleSpec::NativeWorkletsModuleSpec(
    const std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("CommonWorklets", jsInvoker) {
  methodMap_["makeShareableClone"] =
      MethodMetadata{2, SPEC_PREFIX(makeShareableClone)};

  methodMap_["scheduleOnUI"] = MethodMetadata{1, SPEC_PREFIX(scheduleOnUI)};
  methodMap_["executeOnUIRuntimeSync"] =
      MethodMetadata{1, SPEC_PREFIX(executeOnUIRuntimeSync)};
  methodMap_["createWorkletRuntime"] =
      MethodMetadata{2, SPEC_PREFIX(createWorkletRuntime)};
  methodMap_["scheduleOnRuntime"] =
      MethodMetadata{2, SPEC_PREFIX(scheduleOnRuntime)};
}
} // namespace reanimated
