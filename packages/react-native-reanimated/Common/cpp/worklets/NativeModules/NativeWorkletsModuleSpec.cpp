#include <worklets/NativeModules/NativeWorkletsModuleSpec.h>

#define SPEC_PREFIX(FN_NAME) __hostFunction_NativeWorkletsModuleSpec_##FN_NAME

namespace worklets {

NativeWorkletsModuleSpec::NativeWorkletsModuleSpec(
    const std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("NativeWorklets", jsInvoker) {}
} // namespace worklets
