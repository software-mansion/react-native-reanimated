#include <reanimated/NativeModules/NativeReanimatedModuleSpec.h>

#include <utility>

#define SPEC_PREFIX(FN_NAME) __hostFunction_NativeReanimatedModuleSpec_##FN_NAME

namespace reanimated {

// SharedValue

static facebook::jsi::Value SPEC_PREFIX(makeShareableClone)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->makeShareableClone(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

// scheduler

static facebook::jsi::Value SPEC_PREFIX(scheduleOnUI)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->scheduleOnUI(rt, std::move(args[0]));
  return facebook::jsi::Value::undefined();
}

static facebook::jsi::Value SPEC_PREFIX(executeOnUIRuntimeSync)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->executeOnUIRuntimeSync(rt, std::move(args[0]));
}

static facebook::jsi::Value SPEC_PREFIX(createWorkletRuntime)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->createWorkletRuntime(rt, std::move(args[0]), std::move(args[1]));
}

static facebook::jsi::Value SPEC_PREFIX(scheduleOnRuntime)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->scheduleOnRuntime(rt, std::move(args[0]), std::move(args[1]));
}

static facebook::jsi::Value SPEC_PREFIX(registerEventHandler)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->registerEventHandler(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

static facebook::jsi::Value SPEC_PREFIX(unregisterEventHandler)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->unregisterEventHandler(rt, std::move(args[0]));
  return facebook::jsi::Value::undefined();
}

static facebook::jsi::Value SPEC_PREFIX(getViewProp)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->getViewProp(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
  return facebook::jsi::Value::undefined();
}

static facebook::jsi::Value SPEC_PREFIX(enableLayoutAnimations)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->enableLayoutAnimations(rt, std::move(args[0]));
  return facebook::jsi::Value::undefined();
}

static facebook::jsi::Value SPEC_PREFIX(registerSensor)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->registerSensor(
          rt,
          std::move(args[0]),
          std::move(args[1]),
          std::move(args[2]),
          std::move(args[3]));
}

static facebook::jsi::Value SPEC_PREFIX(unregisterSensor)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->unregisterSensor(rt, std::move(args[0]));
  return facebook::jsi::Value::undefined();
}

static facebook::jsi::Value SPEC_PREFIX(configureProps)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->configureProps(rt, std::move(args[0]), std::move(args[1]));
  return facebook::jsi::Value::undefined();
}

static facebook::jsi::Value SPEC_PREFIX(subscribeForKeyboardEvents)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->subscribeForKeyboardEvents(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

static facebook::jsi::Value SPEC_PREFIX(unsubscribeFromKeyboardEvents)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->unsubscribeFromKeyboardEvents(rt, std::move(args[0]));
  return facebook::jsi::Value::undefined();
}

static facebook::jsi::Value SPEC_PREFIX(configureLayoutAnimationBatch)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->configureLayoutAnimationBatch(rt, std::move(args[0]));
}

static facebook::jsi::Value SPEC_PREFIX(setShouldAnimateExiting)(
    facebook::jsi::Runtime &rt,
    facebook::react::TurboModule &turboModule,
    const facebook::jsi::Value *args,
    size_t) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->setShouldAnimateExiting(rt, std::move(args[0]), std::move(args[1]));
  return facebook::jsi::Value::undefined();
}

NativeReanimatedModuleSpec::NativeReanimatedModuleSpec(
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker)
    : facebook::react::TurboModule("NativeReanimated", jsInvoker) {
  methodMap_["makeShareableClone"] =
      MethodMetadata{2, SPEC_PREFIX(makeShareableClone)};

  methodMap_["scheduleOnUI"] = MethodMetadata{1, SPEC_PREFIX(scheduleOnUI)};
  methodMap_["executeOnUIRuntimeSync"] =
      MethodMetadata{1, SPEC_PREFIX(executeOnUIRuntimeSync)};
  methodMap_["createWorkletRuntime"] =
      MethodMetadata{2, SPEC_PREFIX(createWorkletRuntime)};
  methodMap_["scheduleOnRuntime"] =
      MethodMetadata{2, SPEC_PREFIX(scheduleOnRuntime)};

  methodMap_["registerEventHandler"] =
      MethodMetadata{3, SPEC_PREFIX(registerEventHandler)};
  methodMap_["unregisterEventHandler"] =
      MethodMetadata{1, SPEC_PREFIX(unregisterEventHandler)};

  methodMap_["getViewProp"] = MethodMetadata{3, SPEC_PREFIX(getViewProp)};
  methodMap_["enableLayoutAnimations"] =
      MethodMetadata{2, SPEC_PREFIX(enableLayoutAnimations)};
  methodMap_["registerSensor"] = MethodMetadata{4, SPEC_PREFIX(registerSensor)};
  methodMap_["unregisterSensor"] =
      MethodMetadata{1, SPEC_PREFIX(unregisterSensor)};
  methodMap_["configureProps"] = MethodMetadata{2, SPEC_PREFIX(configureProps)};
  methodMap_["subscribeForKeyboardEvents"] =
      MethodMetadata{2, SPEC_PREFIX(subscribeForKeyboardEvents)};
  methodMap_["unsubscribeFromKeyboardEvents"] =
      MethodMetadata{1, SPEC_PREFIX(unsubscribeFromKeyboardEvents)};

  methodMap_["configureLayoutAnimationBatch"] =
      MethodMetadata{1, SPEC_PREFIX(configureLayoutAnimationBatch)};
  methodMap_["setShouldAnimateExitingForTag"] =
      MethodMetadata{2, SPEC_PREFIX(setShouldAnimateExiting)};
}
} // namespace reanimated
