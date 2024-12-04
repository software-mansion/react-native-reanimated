#include <reanimated/NativeModules/ReanimatedModuleProxySpec.h>

#include <utility>

#define REANIMATED_SPEC_PREFIX(FN_NAME) \
  __hostFunction_ReanimatedModuleProxySpec_##FN_NAME

namespace reanimated {

// scheduler

static jsi::Value REANIMATED_SPEC_PREFIX(scheduleOnUI)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->scheduleOnUI(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(executeOnUIRuntimeSync)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->executeOnUIRuntimeSync(rt, std::move(args[0]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(createWorkletRuntime)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->createWorkletRuntime(rt, std::move(args[0]), std::move(args[1]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(scheduleOnRuntime)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->scheduleOnRuntime(rt, std::move(args[0]), std::move(args[1]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(registerEventHandler)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->registerEventHandler(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(unregisterEventHandler)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->unregisterEventHandler(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(getViewProp)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->getViewProp(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(enableLayoutAnimations)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->enableLayoutAnimations(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(registerSensor)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->registerSensor(
          rt,
          std::move(args[0]),
          std::move(args[1]),
          std::move(args[2]),
          std::move(args[3]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(unregisterSensor)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->unregisterSensor(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(configureProps)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->configureProps(rt, std::move(args[0]), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(subscribeForKeyboardEvents)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->subscribeForKeyboardEvents(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(unsubscribeFromKeyboardEvents)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->unsubscribeFromKeyboardEvents(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(configureLayoutAnimationBatch)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->configureLayoutAnimationBatch(rt, std::move(args[0]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(setShouldAnimateExiting)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->setShouldAnimateExiting(rt, std::move(args[0]), std::move(args[1]));
  return jsi::Value::undefined();
}

ReanimatedModuleProxySpec::ReanimatedModuleProxySpec(
    const std::shared_ptr<CallInvoker> &jsInvoker)
    : TurboModule("NativeReanimated", jsInvoker) {
  methodMap_["scheduleOnUI"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(scheduleOnUI)};
  methodMap_["executeOnUIRuntimeSync"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(executeOnUIRuntimeSync)};
  methodMap_["createWorkletRuntime"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(createWorkletRuntime)};
  methodMap_["scheduleOnRuntime"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(scheduleOnRuntime)};

  methodMap_["registerEventHandler"] =
      MethodMetadata{3, REANIMATED_SPEC_PREFIX(registerEventHandler)};
  methodMap_["unregisterEventHandler"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unregisterEventHandler)};

  methodMap_["getViewProp"] =
      MethodMetadata{3, REANIMATED_SPEC_PREFIX(getViewProp)};
  methodMap_["enableLayoutAnimations"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(enableLayoutAnimations)};
  methodMap_["registerSensor"] =
      MethodMetadata{4, REANIMATED_SPEC_PREFIX(registerSensor)};
  methodMap_["unregisterSensor"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unregisterSensor)};
  methodMap_["configureProps"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(configureProps)};
  methodMap_["subscribeForKeyboardEvents"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(subscribeForKeyboardEvents)};
  methodMap_["unsubscribeFromKeyboardEvents"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unsubscribeFromKeyboardEvents)};

  methodMap_["configureLayoutAnimationBatch"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(configureLayoutAnimationBatch)};
  methodMap_["setShouldAnimateExitingForTag"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(setShouldAnimateExiting)};
}
} // namespace reanimated
