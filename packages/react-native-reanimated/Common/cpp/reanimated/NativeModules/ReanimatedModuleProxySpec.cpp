#include <reanimated/NativeModules/ReanimatedModuleProxySpec.h>

#include <utility>

#define REANIMATED_SPEC_PREFIX(FN_NAME) \
  __hostFunction_ReanimatedModuleProxySpec_##FN_NAME

namespace reanimated {

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

static jsi::Value REANIMATED_SPEC_PREFIX(getStaticFeatureFlag)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->getStaticFeatureFlag(rt, std::move(args[0]));
}

static jsi::Value REANIMATED_SPEC_PREFIX(setDynamicFeatureFlag)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->setDynamicFeatureFlag(rt, std::move(args[0]), std::move(args[1]));
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

static jsi::Value REANIMATED_SPEC_PREFIX(setViewStyle)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->setViewStyle(rt, std::move(args[0]), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(markNodeAsRemovable)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->markNodeAsRemovable(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(unmarkNodeAsRemovable)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->unmarkNodeAsRemovable(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(registerCSSKeyframes)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->registerCSSKeyframes(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(unregisterCSSKeyframes)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->unregisterCSSKeyframes(rt, std::move(args[0]), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(applyCSSAnimations)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->applyCSSAnimations(rt, std::move(args[0]), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(unregisterCSSAnimations)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->unregisterCSSAnimations(std::move(args[0]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(registerCSSTransition)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->registerCSSTransition(rt, std::move(args[0]), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(updateCSSTransition)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->updateCSSTransition(rt, std::move(args[0]), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value REANIMATED_SPEC_PREFIX(unregisterCSSTransition)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  static_cast<ReanimatedModuleProxySpec *>(&turboModule)
      ->unregisterCSSTransition(rt, std::move(args[0]));
  return jsi::Value::undefined();
}

ReanimatedModuleProxySpec::ReanimatedModuleProxySpec(
    const std::shared_ptr<CallInvoker> &jsInvoker)
    : TurboModule("NativeReanimated", jsInvoker) {
  methodMap_["registerEventHandler"] =
      MethodMetadata{3, REANIMATED_SPEC_PREFIX(registerEventHandler)};
  methodMap_["unregisterEventHandler"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unregisterEventHandler)};

  methodMap_["getViewProp"] =
      MethodMetadata{3, REANIMATED_SPEC_PREFIX(getViewProp)};
  methodMap_["registerSensor"] =
      MethodMetadata{4, REANIMATED_SPEC_PREFIX(registerSensor)};
  methodMap_["getStaticFeatureFlag"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(getStaticFeatureFlag)};
  methodMap_["unregisterSensor"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unregisterSensor)};
  methodMap_["setDynamicFeatureFlag"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(setDynamicFeatureFlag)};
  methodMap_["subscribeForKeyboardEvents"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(subscribeForKeyboardEvents)};
  methodMap_["unsubscribeFromKeyboardEvents"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unsubscribeFromKeyboardEvents)};

  methodMap_["configureLayoutAnimationBatch"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(configureLayoutAnimationBatch)};
  methodMap_["setShouldAnimateExitingForTag"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(setShouldAnimateExiting)};

  methodMap_["setViewStyle"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(setViewStyle)};

  methodMap_["markNodeAsRemovable"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(markNodeAsRemovable)};
  methodMap_["unmarkNodeAsRemovable"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unmarkNodeAsRemovable)};

  methodMap_["registerCSSKeyframes"] =
      MethodMetadata{3, REANIMATED_SPEC_PREFIX(registerCSSKeyframes)};
  methodMap_["unregisterCSSKeyframes"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(unregisterCSSKeyframes)};

  methodMap_["applyCSSAnimations"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(applyCSSAnimations)};
  methodMap_["unregisterCSSAnimations"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unregisterCSSAnimations)};

  methodMap_["registerCSSTransition"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(registerCSSTransition)};
  methodMap_["updateCSSTransition"] =
      MethodMetadata{2, REANIMATED_SPEC_PREFIX(updateCSSTransition)};
  methodMap_["unregisterCSSTransition"] =
      MethodMetadata{1, REANIMATED_SPEC_PREFIX(unregisterCSSTransition)};
}

} // namespace reanimated
