#include <worklets/NativeModules/NativeWorkletsModuleSpec.h>

#include <utility>

#define WORKLETS_SPEC_PREFIX(FN_NAME) \
  __hostFunction_NativeWorkletsModuleSpec_##FN_NAME

namespace worklets {

static jsi::Value WORKLETS_SPEC_PREFIX(makeShareableClone)(
    jsi::Runtime &rt,
    TurboModule &turboModule,
    const jsi::Value *args,
    size_t) {
  return static_cast<NativeWorkletsModuleSpec *>(&turboModule)
      ->makeShareableClone(
          rt, std::move(args[0]), std::move(args[1]), std::move(args[2]));
}

NativeWorkletsModuleSpec::NativeWorkletsModuleSpec(
    const std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("NativeWorklets", jsInvoker) {
  methodMap_["makeShareableClone"] =
      MethodMetadata{2, WORKLETS_SPEC_PREFIX(makeShareableClone)};
}

} // namespace worklets
