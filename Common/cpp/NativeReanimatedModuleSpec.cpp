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
          rt, std::move(args[0].getNumber()), args[1].asString(rt).utf8(rt));
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

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_registerApplierOnRender(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {

  std::vector<int> svIds;
  jsi::Array ar = args[2].getObject(rt).asArray(rt);
  for (int i = 0; i < ar.length(rt); ++i) {
    int svId = (int)(ar.getValueAtIndex(rt, i).getNumber());
    svIds.push_back(svId);
  }

  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->registerApplierOnRender(
          rt, (int)args[0].getNumber(), (int)args[1].getNumber(), svIds);
  return jsi::Value::undefined();
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_unregisterApplierFromRender(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->unregisterApplierFromRender(
          rt, (int)args[0].getNumber());
  return jsi::Value::undefined();
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_registerEventApplier(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {

  std::vector<int> svIds;
  jsi::Array ar = args[3].getObject(rt).asArray(rt);
  for (int i = 0; i < ar.length(rt); ++i) {
    int svId = (int)(ar.getValueAtIndex(rt, i).getNumber());
    svIds.push_back(svId);
  }

  std::string eventName = args[1].getString(rt).utf8(rt);

  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->registerApplierOnEvent(
          rt, (int)args[0].getNumber(), eventName, (int)args[2].getNumber(), svIds);
  return jsi::Value::undefined();
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_unregisterEventApplier(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->unregisterApplierFromEvent(
          rt, (int)args[0].getNumber());
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

  methodMap_["registerApplierOnRender"] = MethodMetadata{
      3, __hostFunction_NativeReanimatedModuleSpec_registerApplierOnRender};
  methodMap_["unregisterApplierFromRender"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_unregisterApplierFromRender};

  methodMap_["registerEventApplier"] = MethodMetadata{
      4, __hostFunction_NativeReanimatedModuleSpec_registerEventApplier};
  methodMap_["unregisterEventApplier"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_unregisterEventApplier};

  methodMap_["call"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_call};
}

} // namespace react
} // namespace facebook
