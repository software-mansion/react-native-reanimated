#include "NativeReanimatedModuleSpec.h"

#include <android/log.h>
#define APPNAME "NATIVE_REANIMATED"

namespace facebook {
namespace react {

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_call(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->call(
          rt, std::move(args[0].getObject(rt).getFunction(rt)));
  return jsi::Value::undefined();
}

// worklets

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_registerWorklet(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {

  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->registerWorklet(
          rt, std::move(args[0].getNumber()), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_unregisterWorklet(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->unregisterWorklet(
          rt, std::move(args[0].getNumber()));
  return jsi::Value::undefined();
}

// SharedValue

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_registerSharedValue(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->registerSharedValue(
          rt, std::move(args[0].getNumber()), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_unregisterSharedValue(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->unregisterSharedValue(
          rt, std::move(args[0].getNumber()));
  return jsi::Value::undefined();
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_setSharedValue(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->setSharedValue(
          rt, std::move(args[0].getNumber()), std::move(args[1]));
  return jsi::Value::undefined();
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_getSharedValueAsync(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->getSharedValueAsync(
          rt, std::move(args[0].getNumber()), std::move(args[1].getObject(rt).getFunction(rt)));
    return jsi::Value::undefined();
}

NativeReanimatedModuleSpec::NativeReanimatedModuleSpec(std::shared_ptr<JSCallInvoker> jsInvoker)
    : TurboModule("NativeReanimated", jsInvoker) {
  methodMap_["registerWorklet"] = MethodMetadata{
      2, __hostFunction_NativeReanimatedModuleSpec_registerWorklet};
  methodMap_["unregisterWorklet"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_unregisterWorklet};

  methodMap_["registerSharedValue"] = MethodMetadata{
      2, __hostFunction_NativeReanimatedModuleSpec_registerSharedValue};
  methodMap_["unregisterSharedValue"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_unregisterSharedValue};

  methodMap_["setSharedValue"] = MethodMetadata{
      2, __hostFunction_NativeReanimatedModuleSpec_setSharedValue};
  methodMap_["getSharedValueAsync"] = MethodMetadata{
      2, __hostFunction_NativeReanimatedModuleSpec_getSharedValueAsync};

  methodMap_["call"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_call};
}

} // namespace react
} // namespace facebook
