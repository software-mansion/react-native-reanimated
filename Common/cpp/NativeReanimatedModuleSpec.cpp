#include "NativeReanimatedModuleSpec.h"

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
          rt, std::move(args[0].getNumber()), std::move(args[1].getString(rt)));
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

NativeReanimatedModuleSpec::NativeReanimatedModuleSpec(std::shared_ptr<JSCallInvoker> jsInvoker)
    : TurboModule("NativeReanimated", jsInvoker) {
  methodMap_["registerWorklet"] = MethodMetadata{
      2, __hostFunction_NativeReanimatedModuleSpec_registerWorklet};
  methodMap_["unregisterWorklet"] = MethodMetadata{
      2, __hostFunction_NativeReanimatedModuleSpec_unregisterWorklet};

  methodMap_["call"] = MethodMetadata{
        1, __hostFunction_NativeReanimatedModuleSpec_call};
}

} // namespace react
} // namespace facebook
