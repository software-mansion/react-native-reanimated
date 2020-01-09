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

NativeReanimatedModuleSpec::NativeReanimatedModuleSpec()
    : ReanimatedTurboModule("NativeReanimated") {
  methodMap_["getString"] = MethodMetadata{
      1, __hostFunction_NativeReanimatedModuleSpec_getString};
}

} // namespace react
} // namespace facebook