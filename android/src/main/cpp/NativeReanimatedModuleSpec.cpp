#include "NativeReanimatedModuleSpec.h"

namespace facebook {
namespace react {

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_getString(
    jsi::Runtime &rt,
    ReanimatedTurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  return static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->getString(rt, args[0].getString(rt));
}

static jsi::Value __hostFunction_NativeReanimatedModuleSpec_call(
    jsi::Runtime &rt,
    ReanimatedTurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
  static_cast<NativeReanimatedModuleSpec *>(&turboModule)
      ->call(
          rt, std::move(args[0].getObject(rt).getFunction(rt)));
  return jsi::Value::undefined();
}

NativeReanimatedModuleSpec::NativeReanimatedModuleSpec()
    : ReanimatedTurboModule("NativeReanimated") {
  methodMap_["getString"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_getString};

  methodMap_["call"] = MethodMetadata{
        1, __hostFunction_NativeReanimatedModuleSpec_call};
}

} // namespace react
} // namespace facebook